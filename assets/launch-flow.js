(function () {
  const defaultPlanId = 'pro'
  const defaultBillingCycle = 'annual'
  const annualDiscountMultiplier = 0.5
  const currency = 'USD'

  const planCatalog = {
    starter:    { id: 'starter',    name: 'Starter',    monthlyAmountCents: 1000, annualDiscountMultiplier },
    pro:        { id: 'pro',        name: 'Pro',         monthlyAmountCents: 3000, annualDiscountMultiplier },
    enterprise: { id: 'enterprise', name: 'Enterprise',  monthlyAmountCents: 6000, annualDiscountMultiplier },
  }

  const state = {
    selectedPlanId: defaultPlanId,
    billingCycle: defaultBillingCycle,
    popup: null,
    popupMonitor: null,
    requestInFlight: false,
  }

  function formatMoney(amountCents) {
    const hasDecimals = amountCents % 100 !== 0
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency,
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: hasDecimals ? 2 : 0,
    }).format(amountCents / 100)
  }

  function getPlan(planId) { return planCatalog[planId] || planCatalog[defaultPlanId] }

  function getMonthlyPrice(planId, billingCycle) {
    const plan = getPlan(planId)
    const base = plan.monthlyAmountCents
    if (billingCycle === 'annual' && plan.annualDiscountMultiplier) {
      return Math.round(base * plan.annualDiscountMultiplier)
    }
    return base
  }

  function formatModalPrice(planId, billingCycle) {
    return formatMoney(getMonthlyPrice(planId, billingCycle)) + '/mo'
  }

  function formatTotalLabel(planId, billingCycle) {
    const plan = getPlan(planId)
    return plan.name + ' · ' + (billingCycle === 'annual' ? 'Annual billing' : 'Monthly billing')
  }

  function formatTotalPrice(planId, billingCycle) {
    if (billingCycle === 'annual') {
      return formatMoney(getMonthlyPrice(planId, 'annual') * 12) + ' / year'
    }
    return formatMoney(getMonthlyPrice(planId, 'monthly')) + ' / month'
  }

  function updateModalPrices() {
    const cycle = state.billingCycle
    Object.keys(planCatalog).forEach(function (id) {
      var el = document.getElementById('modal-price-' + id)
      if (el) el.textContent = formatModalPrice(id, cycle)
    })
    var totalLabel = document.getElementById('modal-total-label')
    var totalPrice = document.getElementById('modal-total-price')
    if (totalLabel) totalLabel.textContent = formatTotalLabel(state.selectedPlanId, cycle)
    if (totalPrice) totalPrice.textContent = formatTotalPrice(state.selectedPlanId, cycle)
  }

  function selectPlan(planId) {
    state.selectedPlanId = planId
    document.querySelectorAll('.modal-plan').forEach(function (el) { el.classList.remove('selected') })
    var target = document.getElementById('modal-plan-' + planId)
    if (target) target.classList.add('selected')
    updateModalPrices()
    var overlay = document.getElementById('launch-modal')
    if (overlay && overlay.classList.contains('open')) track('plan_selected')
  }

  function selectBillingCycle(cycle) {
    state.billingCycle = cycle
    document.querySelectorAll('.billing-tab').forEach(function (el) {
      el.classList.toggle('active', el.dataset.modalCycle === cycle)
    })
    updateModalPrices()
    syncPageToggle(cycle)
  }

  function syncPageToggle(cycle) {
    document.querySelectorAll('.toggle-option').forEach(function (el) {
      el.classList.toggle('active', el.dataset.cycle === cycle)
    })
    document.querySelectorAll('.price-val').forEach(function (el) {
      var val = cycle === 'annual' ? el.dataset.annual : el.dataset.monthly
      if (val) el.textContent = val
    })
    document.querySelectorAll('.period-label').forEach(function (el) {
      el.textContent = cycle === 'annual' ? 'per month, billed annually' : 'per month, billed monthly'
    })
  }

  function openModal(planId) {
    var overlay = document.getElementById('launch-modal')
    if (!overlay) return
    if (planId) selectPlan(planId)
    overlay.classList.add('open')
    document.body.style.overflow = 'hidden'
    clearStatus()
    track('launch_clicked', { openedFromPlanId: planId || defaultPlanId })
  }

  function closeModal() {
    var overlay = document.getElementById('launch-modal')
    if (overlay) overlay.classList.remove('open')
    document.body.style.overflow = ''
    clearStatus()
  }

  function showStatus(type, message) {
    var el = document.getElementById('modal-status')
    if (!el) return
    el.className = 'modal-status show ' + type
    el.textContent = message
  }

  function clearStatus() {
    var el = document.getElementById('modal-status')
    if (el) { el.className = 'modal-status'; el.textContent = '' }
  }

  function track(eventName, metadata) {
    if (!window.DexterAnalytics || typeof window.DexterAnalytics.track !== 'function') return
    window.DexterAnalytics.track({
      eventType: 'conversion',
      eventName: eventName,
      sectionKey: 'checkout_modal',
      elementKey: state.selectedPlanId + '_' + state.billingCycle,
      metadata: Object.assign({
        planId: state.selectedPlanId,
        billingCycle: state.billingCycle,
      }, metadata || {}),
    })
  }

  function setCheckoutBtnEnabled(enabled) {
    var btn = document.getElementById('modal-checkout-btn')
    if (btn) {
      btn.disabled = !enabled
      btn.textContent = enabled ? 'Continue to Secure Checkout →' : 'Opening checkout…'
    }
  }

  function openCenteredPopup(url) {
    var w = 520, h = 680
    var left = Math.round(window.screenX + (window.outerWidth - w) / 2)
    var top = Math.round(window.screenY + (window.outerHeight - h) / 2)
    return window.open(url, 'dexterCheckout',
      'width=' + w + ',height=' + h + ',left=' + left + ',top=' + top + ',toolbar=0,menubar=0,location=0,status=0')
  }

  function monitorPopup(popup) {
    if (state.popupMonitor) clearInterval(state.popupMonitor)
    state.popupMonitor = setInterval(function () {
      if (!popup || popup.closed) {
        clearInterval(state.popupMonitor)
        state.popupMonitor = null
        state.popup = null
        setCheckoutBtnEnabled(true)
        return
      }
      try {
        var href = popup.location.href
        if (href && href.indexOf('dexter.mom') !== -1) {
          var url = new URL(href)
          var status = url.searchParams.get('checkout')
          if (status === 'success') {
            clearInterval(state.popupMonitor)
            popup.close()
            state.popup = null
            closeModal()
            window.location.href = '/?checkout=success'
          } else if (status === 'cancelled') {
            clearInterval(state.popupMonitor)
            popup.close()
            state.popup = null
            setCheckoutBtnEnabled(true)
            showStatus('error', 'Checkout was cancelled. You can try again anytime.')
          }
        }
      } catch (_) {}
    }, 600)
  }

  async function handleCheckout() {
    if (state.requestInFlight) return
    state.requestInFlight = true
    setCheckoutBtnEnabled(false)
    showStatus('loading', 'Preparing secure checkout…')
    track('checkout_started')

    try {
      var resp = await fetch('/api/launch-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: state.selectedPlanId, billingCycle: state.billingCycle }),
      })
      var data = await resp.json()

      if (!resp.ok || !data.checkoutUrl) {
        throw new Error(data.error || 'Could not create checkout session.')
      }

      clearStatus()
      var popup = openCenteredPopup(data.checkoutUrl)
      if (!popup || popup.closed) {
        track('checkout_redirected', { fallback: 'current_tab' })
        window.location.href = data.checkoutUrl
        return
      }
      state.popup = popup
      track('checkout_redirected', { fallback: 'popup' })
      monitorPopup(popup)
    } catch (err) {
      setCheckoutBtnEnabled(true)
      showStatus('error', err.message || 'Something went wrong. Please try again.')
    } finally {
      state.requestInFlight = false
    }
  }

  function handleCheckoutSuccess() {
    var params = new URLSearchParams(window.location.search)
    if (params.get('checkout') === 'success') {
      track('payment_completed')
      history.replaceState({}, '', '/')
      setTimeout(function () {
        openModal('pro')
        showStatus('success', '🎉 Payment complete! Your Dexter AI account is being activated.')
      }, 200)
    }
  }

  function bindEvents() {
    document.querySelectorAll('[data-launch-open]').forEach(function (el) {
      el.addEventListener('click', function () {
        openModal(el.dataset.planId || defaultPlanId)
      })
    })

    var closeBtn = document.getElementById('modal-close-btn')
    if (closeBtn) closeBtn.addEventListener('click', closeModal)

    var overlay = document.getElementById('launch-modal')
    if (overlay) {
      overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal() })
    }

    document.querySelectorAll('[data-modal-plan]').forEach(function (el) {
      el.addEventListener('click', function () { selectPlan(el.dataset.modalPlan) })
    })

    document.querySelectorAll('[data-modal-cycle]').forEach(function (el) {
      el.addEventListener('click', function () { selectBillingCycle(el.dataset.modalCycle) })
    })

    document.querySelectorAll('[data-cycle]').forEach(function (el) {
      el.addEventListener('click', function () {
        var cycle = el.dataset.cycle
        state.billingCycle = cycle
        syncPageToggle(cycle)
        document.querySelectorAll('.billing-tab').forEach(function (t) {
          t.classList.toggle('active', t.dataset.modalCycle === cycle)
        })
        updateModalPrices()
      })
    })

    var checkoutBtn = document.getElementById('modal-checkout-btn')
    if (checkoutBtn) checkoutBtn.addEventListener('click', handleCheckout)

    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal() })
  }

  document.addEventListener('DOMContentLoaded', function () {
    bindEvents()
    selectBillingCycle(defaultBillingCycle)
    selectPlan(defaultPlanId)
    updateModalPrices()
    handleCheckoutSuccess()
  })
})()
