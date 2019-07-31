const { db, admin } = require("../util/admin");

const firebase = require("firebase");
const config = require("../util/config");

const { validateSignupData, validateLoginData, reduceUserDetails } = require("../util/validators");

firebase.initializeApp(config);

exports.signUp = (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        userHandle: req.body.handle,
    };

    const { errors, valid } = validateSignupData(newUser);
    if (!valid) return res.status(400).json(errors);

    const no_img = 'default_profile_image.png';

    let token, userId;
    db.doc(`/Users/${newUser.userHandle}`)
        .get()
        .then((doc) => {
            if (doc.exists) {
                return res.status(400).json({ handle: "El nombre de usuario ya está en uso." });
            } else {
                return firebase
                    .auth()
                    .createUserWithEmailAndPassword(newUser.email, newUser.password);
            }
        })
        .then((data) => {
            userId = data.user.uid;
            return data.user.getIdToken();
        })
        .then((idtoken) => {
            token = idtoken;
            const userCredentials = {
                userHandle: newUser.userHandle,
                email: newUser.email,
                imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${no_img}?alt=media`,
                createdAt: new Date().toISOString(),
                userId,
                totalProjects: 0
            };
            const stats ={
                aluminio: 0,
                papel: 0,
                vidrio: 0,
                plastico: 0,
                organica: 0,
                total: 0
            };

            db.doc(`/Stats/${newUser.userHandle}`)
                .set(stats);

            return db.doc(`/Users/${newUser.userHandle}`)
                .set(userCredentials);
        })
        .then(() => {
            return res.status(201).json({ token });
        })
        .catch((err) => {
            console.log(err);
            if (err.code === 'auth/email-already-in-use') {
                return res.status(400).json({ error: "El correo ya ha sido registrado." });
            }
            else if (err.code === 'auth/weak-password') {
                return res.status(400).json({ error: "La contraseña debe tener una longitud de 6 caracteres." });
            }
            else {
                return res.status(500).json({ general: err.code });
            }
        });

}

exports.login = (req, res) => {

    const user = {
        email: req.body.email,
        password: req.body.password
    };

    const { errors, valid } = validateLoginData(user);
    if (!valid) return res.status(400).json(errors);

    firebase.auth().signInWithEmailAndPassword(user.email, user.password)
        .then((data) => {
            return data.user.getIdToken();
        })
        .then((token) => {
            return res.status(200).json({ token });
        })
        .catch((err) => {
            console.log(err);
            return res.status(403).json({ error: "Credenciales incorrectas. Inténtelo de nuevo." });
        })


}

//User details

exports.addUserDetails = (req, res) => {
    let userDetails = reduceUserDetails(req.body);

    db.doc(`/Users/${req.user.handle}`)
        .update(userDetails)
        .then(() => {
            return res.json({ message: "Sus datos ha sido guardados exitosamente." });
        })
        .catch((err) => {
            return res.status(500).json({ error: err.code });
        })

}

//Get own details

exports.getAuthenticatedUser = (req, res) => {
    let userData = {};

    db.doc(`/Users/${req.user.handle}`)
        .get()
        .then(doc => {
            if (doc.exists) {
                userData.credentials = doc.data();
                return db.collection('Likes').where('userHandle', '==', req.user.handle).get()
            }
        })
        .then(data => {
            userData.likes = [];
            data.forEach(doc => {
                userData.likes.push(doc.data());
            })
            //return res.json(userData);
            return db.collection('Notifications')
                .where('recipient', '==', req.user.handle)
                .orderBy('createdAt', 'desc')
                .limit(10)
                .get()
        })
        .then((data) => {
            userData.notifications = [];
            data.forEach(doc => {
                userData.notifications.push({
                    recipient: doc.data().recipient,
                    sender: doc.data().sender,
                    createdAt: doc.data().createdAt,
                    projectId: doc.data().projectId,
                    type: doc.data().type,
                    read: doc.data().read,
                    notificationId: doc.id
                })
            });

            return res.json(userData);
        })
        .catch(err => {
            console.log(err);
            return res.status(500).json({ error: err.code });
        })
}


exports.uploadImage = (req, res) => {


    const Busboy = require('busboy');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');

    busboy = new Busboy({ headers: req.headers });

    let imageFileName;
    let imageToBeUploaded = {};


    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {

        //console.log(fieldname);
        //console.log(filename);
        //console.log(mimetype);

        const imageExtension = filename.split('.')[filename.split('.').length - 1];
        imageFileName = `${Math.round(Math.random() * 1000000000000)}.${imageExtension}`;

        const filepath = path.join(os.tmpdir(), imageFileName);


        imageToBeUploaded = { filepath, mimetype };
        file.pipe(fs.createWriteStream(filepath));
    });

    busboy.on('finish', () => {
        admin.storage().bucket().upload(imageToBeUploaded.filepath, {
            resumable: false,
            metadata: {
                metadata: {
                    contentType: imageToBeUploaded.mimetype
                }
            }
        })
            .then(() => {
                const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
                return db.doc(`/Users/${req.user.handle}`).update({ imageUrl })
                    .then(() => {
                        return res.status(201).json({ message: "Imagen subida exitosamente." });
                    })
                    .catch(err => {
                        return res.status(500).json({ error: err });
                    });
            });
    });
    busboy.end(req.rawBody);
}

//Get any user's details
exports.getUserDetails = (req, res) => {
    let userData = {};

    db.doc(`/Users/${req.params.handle}`)
        .get()
        .then(doc => {
            if (doc.exists) {
                userData.user = doc.data();
                return db.collection('Projects')
                    .where('userHandle', '==', req.params.handle)
                    .orderBy('createdAt', 'desc')
                    .get();
            }
            else {
                return res.status(404).json({ error: 'Usuario no encontrado.' });
            }
        })
        .then(data => {
            userData.projects = [];
            data.forEach(doc => {
                userData.projects.push({
                    title: doc.data().title,
                    userHandle: doc.data().userHandle,
                    description: doc.data().description,
                    urlContent: doc.data().urlContent,
                    createdAt: doc.data().createdAt,
                    userImage: doc.data().userImage,
                    likeCount: doc.data().likeCount,
                    commentCount: doc.data().commentCount,
                    projectId: doc.id
                });
            });
            return res.json(userData);
        })
        .catch(err => {
            console.log(err);
            return res.status(500).json({ error: err.code });
        })

}

//Mark notifications read

exports.markNotificationsRead = (req, res) => {
    let batch = db.batch();

    req.body.forEach(notificationId => {
        const notification = db.doc(`/Notifications/${notificationId}`);
        batch.update(notification, { read: true });
    });

    batch.commit()
        .then(() => {
            return res.json({ message: 'Notificaciones marcadas como leídas' })
        })
        .catch(err => {
            console.log(err);
            return res.status(500).json({ error: err.code });
        })
};

exports.getUserHandle = (req, res) => {
    return res.status(200).json({userHandle: req.user.handle});
};