const form = document.getElementById('form')

form.addEventListener('submit', (event) => {
  event.preventDefault()

  chrome.tabs.query({ active: true, lastFocusedWindow: true }, ([tab]) => {
    if (!tab) return

    chrome.tabs.reload(tab.id)

    chrome.webNavigation.onCommitted.addListener(
      (details) => {
        if (details.transitionType != 'reload') return

        chrome.permissions.request({ origins: [tab.url] }, (granted) => {
          if (!granted) return

          const refreshInterval = document.querySelector(
            'input[name=refresh_interval]'
          ).value

          chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            func: (refreshInterval) => {
              window.addEventListener('load', () => {
                let appRoot, timeFrame, preset

                const n = Math.ceil(Number(refreshInterval)) || 30
                if (n < 5) n = 5

                const seconds = 1000

                setInterval(function () {
                  appRoot = document.querySelector('app-root')
                  if (!appRoot) return

                  timeFrame = appRoot.querySelector(
                    'a.label-box.ng-star-inserted'
                  )
                  if (timeFrame) {
                    timeFrame.click()
                    appRoot = document.querySelector('app-root')
                  }

                  preset = appRoot.querySelector(
                    'a.predefined-item.ng-star-inserted'
                  )
                  if (preset) preset.click()
                }, n * seconds)
              })
            },
            args: [refreshInterval],
          })
        })
      },
      { tadId: tab.id }
    )
  })

  window.close()
})
