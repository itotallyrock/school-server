const { Router } = require('express')

let router = Router({ mergerParams: true })
router.get('/', (request, response) => {
  response.status(200).send('Success')
})

module.exports = router
