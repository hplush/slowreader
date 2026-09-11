document.documentElement.className = localStorage.getItem('slowreader:userId')
  ? 'is-user'
  : 'is-guest'
