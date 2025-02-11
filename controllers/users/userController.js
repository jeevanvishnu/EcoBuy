
// page not found
const pageNoteFound = async (req,res) =>{
    try {
        res.render("user/page404")
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const loadHome = async (req , res) =>{
    try {

        await res.render('user/home')

    } catch (error) {

        console.log(`Home page rendering error ${error.message}`)
        res.status(500).send('Internal Server Error')
        
    }
}

export default  {
    loadHome,
    pageNoteFound
}