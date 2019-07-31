const { db, admin } = require("./admin");

module.exports  = (req, res, next) => {

    let idToken;

    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer ')){
        idToken = req.headers.authorization.split('Bearer ')[1];
    }
    else{
        console.log("No token found");
        res.status(403).json({ error: "Unauthorized" });
    }

    admin.auth().verifyIdToken(idToken)
        .then(decodedToken => {
            req.user = decodedToken;
            return db
                .collection('Users')
                .where('userId', "==", req.user.uid)
                .limit(1)
                .get();
        })
        .then(data => {
            req.user.handle = data.docs[0].data().userHandle;
            req.user.imageUrl = data.docs[0].data().imageUrl;
            return next();
        })
        .catch(err => {
            res.status(403).json({ "token error": err });
            console.log(err);
        });
}