'use strict'

/**
 * Executes a script to refresh a tab that opens the Dynatrace "Problems" page, periodically.
 *
 * @param {number} tabId The Chrome tab id.
 * @param {number} refreshInterval The time interval to refresh the tab.
 */
const refreshTab = (tabId, refreshInterval) => {
  chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    args: [chrome.runtime.id, refreshInterval],
    func: (extensionId, refreshInterval) => {
      /**
       * Creates custom CSS that will be used by the extension.
       */
      const setupCss = () => {
        const css = document.createElement('style')
        css.innerText = `
          .ext-label {
            padding: 2px 4px;
            border: 1px solid #ccc;
            border-radius: 4px;
            margin-y: 4px;
            margin-right: 4px;
          }

          .ext-label.copy:hover {
            cursor: pointer;
            border-color: #00a1b2;
          }

          .ext-snackbar {
            visibility: hidden;
            min-width: 250px;
            margin-left: -125px;
            background-color: #333;
            color: #fff;
            text-align: center;
            border-radius: 2px;
            padding: 16px;
            position: fixed;
            z-index: 1;
            left: 50%;
            bottom: 30px;
          }

          .ext-snackbar.show {
            visibility: visible;
            -webkit-animation: fadein 0.5s, fadeout 0.5s 2.5s;
            animation: fadein 0.5s, fadeout 0.5s 2.5s;
          }

          @-webkit-keyframes fadein {
            from {bottom: 0; opacity: 0;}
            to {bottom: 30px; opacity: 1;}
          }

          @keyframes fadein {
            from {bottom: 0; opacity: 0;}
            to {bottom: 30px; opacity: 1;}
          }

          @-webkit-keyframes fadeout {
            from {bottom: 30px; opacity: 1;}
            to {bottom: 0; opacity: 0;}
          }

          @keyframes fadeout {
            from {bottom: 30px; opacity: 1;}
            to {bottom: 0; opacity: 0;}
          }
        `
        document.head.appendChild(css)
      }

      /**
       * Show snackbar.
       *
       * @param {string} text The text to be displayed in the snackbar.
       * @param {number} n The amount of time in milliseconds.
       */
      const showSnackbar = (text, n = 2000) => {
        const snackbar = document.createElement('div')
        snackbar.classList.add('ext-snackbar')
        snackbar.classList.add('show')
        snackbar.textContent = text
        document.body.appendChild(snackbar)
        setTimeout(() => {
          snackbar.remove()
        }, n)
      }

      /**
       * Pauses execution for n milliseconds.
       *
       * @param {number} n The amount of time in milliseconds.
       */
      const sleep = (n = 0) => {
        return new Promise((resolve) => setTimeout(resolve, n))
      }

      /**
       * Refreshes Dynatrace "Problems" page by clicking the topmost time preset in the navigation bar.
       */
      const refreshAlerts = () => {
        const timeFrameNavSelector = 'app-root a.label-box.ng-star-inserted'
        document.querySelector(timeFrameNavSelector)?.click()
        const refreshBtnSelector = 'app-root a.predefined-item.ng-star-inserted'
        document.querySelector(refreshBtnSelector)?.click()
      }

      /**
       * Show custom elements in the Dynatrace "Problems" page.
       *
       * @param {RegExp} rules.alertRegex The regular expression for the alert.
       * @param {string} rules.knowledgeId The knowledge id for the alert.
       */
      const showCustomElements = async (rules) => {
        const problemSelector =
          '.dt-cell.dt-indicator.dt-table-column-align-text.dt-table-column-title.dt-color-error.ng-star-inserted .dt-info-group-title'
        const problemDoms = document.querySelectorAll(problemSelector)
        const problemTitles = []
        for (dom of problemDoms) {
          problemTitles.push(dom.textContent.trim())
        }

        const serviceSelector =
          '.dt-cell.dt-indicator.dt-table-column-align-text.dt-table-column-title.dt-color-error.ng-star-inserted ~ .dt-cell.dt-table-column-align-text.dt-table-column-impactedEntities.ng-star-inserted'
        const serviceDoms = document.querySelectorAll(serviceSelector)
        const serviceTitles = []
        for (dom of serviceDoms) {
          serviceTitles.push(dom.textContent.trim())
        }

        // Set alerts to this format "<service title>: <problem title>".
        const alerts = []
        for (let i = 0; i < problemTitles.length; i++) {
          alerts.push(`${serviceTitles[i]}: ${problemTitles[i]}`)
        }

        for (let i = 0; i < alerts.length; i++) {
          const problemId = problemDoms[i].nextSibling.textContent
            .trim()
            .slice(0, -1)

          // Show label for problem id.
          const labelProblemId = document.createElement('span')
          labelProblemId.classList.add('ext-label')
          labelProblemId.appendChild(problemDoms[i].nextSibling)
          labelProblemId.appendChild(problemDoms[i].nextSibling)
          problemDoms[i].insertAdjacentElement('afterend', labelProblemId)

          // Show label for knowledge id.
          let j = 0
          let found = false
          while (j < rules.length && found === false) {
            found = rules[j].alertRegex.test(alerts[i])
            found || j++
          }
          if (found) {
            const labelKnowledgeId = document.createElement('span')
            labelKnowledgeId.classList.add('ext-label')
            labelKnowledgeId.textContent = 'KBA-' + rules[j].knowledgeId
            problemDoms[i].insertAdjacentElement('afterend', labelKnowledgeId)
          }

          // Show button to copy alert to clipboard.
          const btnCopyToClipboard = document.createElement('span')
          btnCopyToClipboard.classList.add('ext-label')
          btnCopyToClipboard.classList.add('copy')
          btnCopyToClipboard.textContent = 'Copy event'
          btnCopyToClipboard.onclick = () => {
            navigator.clipboard.writeText(
              `Event-Dynatrace - ${problemId} "${alerts[i]}"`
            )
            showSnackbar('Text copied to clipboard')
          }
          problemDoms[i].insertAdjacentElement('afterend', btnCopyToClipboard)
        }
      }

      window.addEventListener('load', async () => {
        alert('Autorefresh applied')

        // Get alert rules from the Chrome extension folder.
        const url = `chrome-extension://__MSG_@@${extensionId}/rules_collection.json`
        const res = await fetch(url)
        const { data: rules } = await res.json()

        // Transform every regular expression string to RegExp object.
        for (let i = 0; i < rules.length; i++) {
          rules[i].alertRegex = new RegExp(rules[i].alertRegex)
        }

        setupCss()

        for (;;) {
          do {
            await sleep(500)
          } while (document.querySelector('dt-loading-distractor'))
          showCustomElements(rules)
          await sleep(refreshInterval)
          refreshAlerts()
        }
      })
    },
  })
}

const availableIntervals = [5, 10, 30]

/**
 * Things to do after the page has been loaded.
 */
const handlePageLoad = () => {
  const refreshInterval = localStorage.getItem('dynafresh_refresh_interval')
  if (availableIntervals.includes(Number(refreshInterval))) {
    document.getElementById(
      `refresh-interval-${refreshInterval}`
    ).selected = true
  }
}

/**
 * Handles form submission.
 *
 * @param {Event} event The event interface.
 */
const handleSubmit = async (event) => {
  event.preventDefault()

  // Validate refresh interval value.
  let refreshInterval = Number(
    document.querySelector('.input[name=refresh_interval]').value
  )
  if (!availableIntervals.includes(refreshInterval)) {
    return
  }
  localStorage.setItem('dynafresh_refresh_interval', refreshInterval.toString())

  // Convert seconds to milliseconds.
  refreshInterval *= 1000

  // Get current active tab.
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  })

  await chrome.tabs.reload(tab.id)

  // Apply script injection on a tab.
  chrome.webNavigation.onCommitted.addListener(
    async ({ transitionType }) => {
      if (transitionType != 'reload') {
        return
      }

      // TODO: is this necessary?
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

try {
  window.addEventListener('load', handlePageLoad)
  document.getElementById('form').addEventListener('submit', handleSubmit)
} catch (e) {
  console.error('Error encountered', e)
}
