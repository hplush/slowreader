let autoprefixer = require('autoprefixer')
let labFunction = require('postcss-lab-function')

module.exports = {
  plugins: [labFunction, autoprefixer]
}
