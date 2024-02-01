'use strict'

const refreshTab = (tabId, refreshInterval) => {
  chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    args: [refreshInterval],
    func: (refreshInterval) => {
      const doRefresh = () => {
        const timeFrameNav = document.querySelector(
          'app-root a.label-box.ng-star-inserted'
        )
        if (timeFrameNav) {
          timeFrameNav.click()
        }

        const refreshBtn = document.querySelector(
          'app-root a.predefined-item.ng-star-inserted'
        )
        if (refreshBtn) {
          refreshBtn.click()
        }
      }

      window.addEventListener('load', () =>
        setInterval(doRefresh, refreshInterval)
      )
    },
  })
}

const handleSubmit = async (event) => {
  event.preventDefault()

  let refreshInterval = Math.ceil(
    Number(document.querySelector('input[name=refresh_interval]').value)
  )

  const secondInMilliseconds = 1000
  if (refreshInterval < 5) {
    refreshInterval = 5 * secondInMilliseconds
  } else {
    refreshInterval *= secondInMilliseconds
  }

  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  })

  chrome.tabs.reload(tab.id)

  chrome.webNavigation.onCommitted.addListener(
    async ({ transitionType }) => {
      if (transitionType != 'reload') {
        return
      }

      const granted = await chrome.permissions.request({ origins: [tab.url] })
      if (!granted) {
        return
      }

      refreshTab(tab.id, refreshInterval)
    },
    { tadId: tab.id }
  )

  window.close()
}

document.getElementById('form').addEventListener('submit', handleSubmit)
