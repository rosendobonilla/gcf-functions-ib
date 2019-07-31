const { db } = require("../util/admin");

exports.getAllTrashUser = (req, res) => {
    console.log(req.params.projectId);
    db.collection("Trash")
        .where('userHandle', '==', req.params.userHandle)
        .get()
        .then(data => {
            let trash = [];
            data.forEach((doc) => {
                trash.push({
                    trashId: doc.id,
                    userHandle: doc.data().userHandle,
                    type: doc.data().type,
                    createdAt: doc.data().createdAt,
                });
            });
            return res.json(trash);
        })
        .catch((error) => console.log("Error: " + error));
};

//Get trash from user
exports.getTrashUser = (req, res) => {
    let count = 0;
    db.collection("Trash")
        .where("userHandle",'==',req.params.userHandle)
        .where("type", '==', req.params.typeTrash)
        .get()
        .then(data => {
            let trash = [];
            data.forEach((doc) => {
                count++;
                trash.push({
                    trashId: doc.id,
                    userHandle: doc.data().userHandle,
                    type: doc.data().type,
                    createdAt: doc.data().createdAt,
                });
            });
            return res.json({"total" : count});
        })
        .catch((error) => console.log("Error: " + error));
};

//Create user trash entry

exports.createTrash = (req, res) => {

    const newTrash = {
        type: req.body.type,
        userHandle: req.user.handle,
        createdAt: new Date().toISOString(),
    };

    db.collection("Trash")
        .add(newTrash)
        .then((doc) => {
            const resTrash = newTrash;
            resTrash.trashId = doc.id;
            res.json(resTrash);
        })
        .catch(err => {
            res.status(500).json({ error: "Something went wrong" });
            console.log(err);
        });
};

exports.updateTrashStats = (req, res) => {
    const docStatUser = db.collection('Stats').doc(req.user.handle);

    docStatUser
        .get()
        .then(doc => {
            if(!doc.exists){
                return res.status(400).json({ error: 'Stat branch not found' });
            }
            else{
                let nuevoValor, nuevoTotal;
                if(req.body.type === "organica"){
                    nuevoValor = doc.data().organica - req.body.cantidad;
                    docStatUser.update({ organica: nuevoValor });
                }
                else if(req.body.type === "aluminio"){
                    nuevoValor = doc.data().aluminio - req.body.cantidad;
                    docStatUser.update({ aluminio: nuevoValor });
                }
                else if(req.body.type === "papel"){
                    nuevoValor = doc.data().papel - req.body.cantidad;
                    docStatUser.update({ papel: nuevoValor });
                }
                else if(req.body.type === "vidrio"){
                    nuevoValor = doc.data().vidrio - req.body.cantidad;
                    docStatUser.update({ vidrio: nuevoValor });
                }
                else if(req.body.type === "plastico"){
                    nuevoValor = doc.data().plastico - req.body.cantidad;
                    docStatUser.update({ plastico: nuevoValor });
                }
                nuevoTotal = doc.data().total - req.body.cantidad;
                docStatUser.update({ total: nuevoTotal });

                const userDoc = db.collection('Users').doc(req.user.handle);

                userDoc
                    .get()
                    .then(doc => {
                        let nuevoTotalProjects;
                        if (!doc.exists) {
                            return res.status(400).json({error: 'User branch not found'});
                        } else {
                            nuevoTotalProjects = doc.data().totalProjects + 1;
                            userDoc.update({ totalProjects: nuevoTotalProjects });
                        }
                    });
            }
        })
        .then(() => {
            res.json({ message: 'Project updated succesfully' });
        })
        .catch(err => {
            console.log(err);
            return res.status(500).json({ error: err.code });
        });
};

exports.getTrashHistory = (req, res) => {

    db.collection('Trash')
        .where('userHandle', '==', req.user.handle)
        .orderBy("createdAt","desc")
        .onSnapshot(data => {
            let trash = [];
            data.forEach((doc) => {
                trash.push({
                    trashId: doc.id,
                    userHandle: doc.data().userHandle,
                    type: doc.data().type,
                    createdAt: doc.data().createdAt,
                });
            });
            return res.json(trash);
    }, err => {
        console.log(`Encountered error: ${err}`);
    });
};

exports.createRecycling = (req, res) => {

    const recycled = {
        trashType: req.body.trashType,
        quantityRecycled: req.body.quantityRecycled,
        userHandle: req.user.handle,
        createdAt: new Date().toISOString(),
    };

    db.collection("Recycling")
        .add(recycled)
        .then((doc) => {
            const infoRecycled = recycled;
            infoRecycled.trashId = doc.id;
            res.json(infoRecycled);
        })
        .catch(err => {
            res.status(500).json({ error: "Something went wrong" });
            console.log(err);
        });
};