const form = document.getElementById('form')

form.addEventListener('submit', (e) => {
  e.preventDefault()

  const dynatraceProblemsPage = document.querySelector(
    'input[name=dynatrace_problems_page]'
  ).value
  const refreshInterval = document.querySelector(
    'input[name=refresh_interval]'
  ).value

  chrome.permissions.request(
    {
      origins: [dynatraceProblemsPage],
    },
    (granted) => {
      if (!granted) return

      chrome.tabs.query({ url: dynatraceProblemsPage }, (tabs) => {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id, allFrames: true },
          func: (refreshInterval) => {
            let appRoot, timeFrame, preset
            const n = Math.ceil(Number(refreshInterval)) || 1
            const seconds = 1000
            setInterval(() => {
              appRoot = document.querySelector('app-root')
              if (!appRoot) return
              timeFrame = appRoot.querySelector('a.label-box.ng-star-inserted')
              if (timeFrame) {
                timeFrame.click()
                appRoot = document.querySelector('app-root')
              }
              preset = appRoot.querySelector(
                'a.predefined-item.ng-star-inserted'
              )
              if (preset) preset.click()
            }, n * seconds)
          },
          args: [refreshInterval],
        })
      })
    }
  )

  window.close()
})
