let autoprefixer = require('autoprefixer')
let htmlKeeper = require('./postcss/html-keeper.cts')
let themeClasses = require('./postcss/theme-classes.cts')
let pseudoClasses = require('./postcss/pseudo-classes.cts')

module.exports = {
  plugins: [htmlKeeper, themeClasses, pseudoClasses, autoprefixer]
}
