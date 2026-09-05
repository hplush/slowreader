let button = document.querySelector('button')!
let text = document.querySelector('p')!

button.textContent = chrome.i18n.getMessage('allow')
text.textContent = chrome.i18n.getMessage('why')

button.addEventListener('click', () => {
  chrome.permissions.request({ origins: ['*://*/*'] }, granted => {
    if (granted) window.close()
  })
})
