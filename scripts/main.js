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
      permissions: ['tabs'],
      origins: [dynatraceProblemsPage],
    },
    (granted) => {
      if (granted) {
        chrome.tabs.query({ url: dynatraceProblemsPage }, (tabs) => {
          const firstTab = tabs[0]
          chrome.scripting.executeScript({
            target: { tabId: firstTab.id, allFrames: true },
            func: (refreshInterval) => {
              console.log(`akan refresh per ${refreshInterval} detik`)
              const timeFrameNav = document.querySelector(
                'a.label-box.ng-star-inserted'
              )
            },
            args: [refreshInterval],
          })
        })
      }
    }
  )
})
