const express = require("express")
const router = express.Router()

const dbController = require('../controllers/db.controller')

router.get("/shop/quantities", dbController.get_shop_quantities)
router.post("/shop/pay", dbController.post_shop_pay)

router.get("/orders", dbController.get_orders)
router.post("/ff/complete", dbController.post_ff_complete)

router.post("/rcv/available", dbController.post_rcv_available)
router.get("/admin/brackets", dbController.get_admin_brackets)
router.post("/admin/add_bracket", dbController.post_admin_add_bracket)
router.post("/admin/remove_bracket", dbController.post_admin_remove_bracket)

module.exports = router