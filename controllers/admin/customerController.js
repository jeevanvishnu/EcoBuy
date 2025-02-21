import User from "../../models/userSchema.js";

const customerInfo = async (req, res) => {
    try {
        let search = '';  
        let page = parseInt(req.query.page) || 1; 
        const limit = 3; 

        const userData = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: '.*' + search + '.*', $options: 'i' } }, 
                { email: { $regex: '.*' + search + '.*', $options: 'i' } }
            ],
        })
        .limit(limit)
        .skip((page - 1) * limit)
        .exec();

        const count = await User.countDocuments({
            isAdmin: false,
            $or: [
                { name: { $regex: '.*' + search + '.*', $options: 'i' } },
                { email: { $regex: '.*' + search + '.*', $options: 'i' } }
            ],
        });

        res.render('admin/customers', {
            data: userData,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        });

    } catch (error) {
        console.log("Customer error", error.message);
        return res.status(500).send('Internal server error');
    }
};


const customerBlocked = async (req, res) => {
    try {

        let id = req.query.id
        await User.updateOne({ _id: id }, { $set: { isBlocked: true } })
        res.redirect('/admin/users')
    } catch (error) {
        console.log('block error', error.message)
        res.redirect('pageerror')
    }
}

const customerUnBlocked = async (req, res) => {
    try {

        let id = req.query.id
        await User.updateOne({ _id: id }, { $set: { isBlocked: false } })


        res.redirect('/admin/users')

    } catch (error) {
        console.log('unblock error', error.message)
        res.redirect('pageerror')

    }
}



export default {
    customerInfo,
    customerBlocked,
    customerUnBlocked
}

