let autoprefixer = require('autoprefixer')

let htmlKeeper = require('./postcss/html-keeper.cts')
let pseudoClasses = require('./postcss/pseudo-classes.cts')
let themeClasses = require('./postcss/theme-classes.cts')

module.exports = {
  plugins: [htmlKeeper, themeClasses, pseudoClasses, autoprefixer]
}
