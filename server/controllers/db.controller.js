const postgre = require('../database')

const dbController = {
    nothing: async(req, res) => {
        try {
            const { rows } = await postgre.query("select * from customers")
            res.json({msg: "OK", data: rows})
        } catch (error) {
            res.json({msg: error.msg})
        }
    },
}

module.exports = dbController