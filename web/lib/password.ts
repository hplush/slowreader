import type { SavedPassword } from '@slowreader/core'

export async function savePassword(fields: SavedPassword): Promise<void> {
  if (window.PasswordCredential) {
    await navigator.credentials.store(
      new window.PasswordCredential({
        id: fields.userId,
        password: fields.password
      })
    )
  } else {
    let form = document.createElement('form')
    form.classList.add('sr-only')
    form.addEventListener('submit', e => {
      e.preventDefault()
    })
    let userInput = document.createElement('input')
    userInput.type = 'text'
    userInput.name = 'username'
    userInput.autocomplete = 'username'
    userInput.value = fields.userId
    form.appendChild(userInput)
    let passwordInput = document.createElement('input')
    passwordInput.type = 'password'
    passwordInput.name = 'password'
    passwordInput.autocomplete = 'new-password'
    passwordInput.value = fields.password
    form.appendChild(passwordInput)
    let button = document.createElement('button')
    button.type = 'submit'
    form.appendChild(button)
    document.body.appendChild(form)
    button.click()
    setTimeout(() => {
      document.body.removeChild(form)
    }, 1000)
  }
}
