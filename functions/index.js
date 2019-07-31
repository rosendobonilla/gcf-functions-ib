const functions = require('firebase-functions');

const app = require('express')();

const FBAuth = require("./util/fbAuth");

const { db } = require("./util/admin");

const {
    getAllProjects,
    createProject,
    getProject,
    commentOnProject,
    likeProject,
    unlikeProject,
    deleteProject
} = require("./handlers/projects");

const {
    signUp,
    login,
    uploadImage,
    addUserDetails,
    getAuthenticatedUser,
    getUserDetails,
    markNotificationsRead,
    getUserHandle
} = require("./handlers/users");

const {
    getAllTrashUser,
    getTrashUser,
    createTrash,
    updateTrashStats,
    getTrashHistory,
    createRecycling
} = require("./handlers/trash");


//Basura

app.get('/trash/:userHandle', getAllTrashUser);
app.get('/trash/:userHandle/:typeTrash', getTrashUser);
app.post('/trash', FBAuth,createTrash);
app.post('/trash/update', FBAuth, updateTrashStats);
app.post('/trash/history', FBAuth, getTrashHistory);
app.post('/trash/recycling', FBAuth, createRecycling);

//Proyectos
app.get('/projects', getAllProjects);
app.post('/project', FBAuth, createProject);
app.get('/project/:projectId', getProject);
app.post('/project/:projectId/comment', FBAuth, commentOnProject);
app.get('/project/:projectId/like', FBAuth, likeProject);
app.get('/project/:projectId/unlike', FBAuth, unlikeProject);
app.post('/project/delete/:projectId', FBAuth, deleteProject);


//Usuarios
app.post('/signup', signUp);
app.post('/login', login);
app.post('/user/image', FBAuth, uploadImage);
app.post('/user', FBAuth, addUserDetails);
app.get('/user', FBAuth, getAuthenticatedUser);
app.get('/user/:handle', getUserDetails);
app.post('/notifications', FBAuth, markNotificationsRead);
app.post('/user/userHandle', FBAuth, getUserHandle);


//For error auth is not a function
//remove node_modules and package-lock.json and reinstall 
//dependencies

//For error 9 -> check createIndex in console.log

exports.api = functions.https.onRequest(app);

exports.createNotificationsOnLike = functions.firestore.document('Likes/{id}')
    .onCreate((snapshot) => {
        return db.doc(`/Projects/${snapshot.data().projectId}`).get()
            .then(doc => {
                if (doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
                    return db.doc(`/Notifications/${snapshot.id}`).set({
                        createdAt: new Date().toISOString(),
                        recipient: doc.data().userHandle,
                        sender: snapshot.data().userHandle,
                        type: 'like',
                        read: false,
                        projectId: doc.id
                    })
                }
            })
            .catch(err => console.log(err));
    });

exports.deleteNotificationOnUnlike = functions.firestore.document('Likes/{id}')
    .onDelete((snapshot) => {
        return db.doc(`/Notifications/${snapshot.id}`)
            .delete()
            .catch((err) => {
                console.log(err);
                return;
            });
    });

exports.createNotificationsOnComment = functions.firestore.document('Comments/{id}')
    .onCreate((snapshot) => {
        return db.doc(`/Projects/${snapshot.data().projectId}`)
            .get()
            .then((doc) => {
                if (doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
                    return db.doc(`/Notifications/${snapshot.id}`).set({
                        createdAt: new Date().toISOString(),
                        recipient: doc.data().userHandle,
                        sender: snapshot.data().userHandle,
                        type: 'comment',
                        read: false,
                        projectId: doc.id
                    });
                }
            })
            .catch(err => {
                console.log(err);
                return;
            });
    });

exports.onUserImageChanged = functions.firestore.document('/Users/{userId}')
    .onUpdate(change => {
        console.log(change.before.data());
        console.log(change.after.data());
        if (change.before.data().imageUrl !== change.after.data().imageUrl) {
            let batch = db.batch();
            return db.collection('Projects')
                .where('userHandle', '==', change.before.data().userHandle).get()
                .then(data => {
                    data.forEach(doc => {
                        const project = db.doc(`/Projects/${doc.id}`);
                        batch.update(project, { userImage: change.after.data().imageUrl });
                    })
                    return batch.commit();
                });
        }
        else{
            return true;
        }
    });

exports.onProjectDelete = functions
    .firestore.document('/Projects/{projectId}')
    .onDelete((snapshot, context) => {
        const projectId = context.params.projectId;
        const batch = db.batch();
        return db
            .collection('Comments')
            .where('projectId', '==', projectId)
            .get()
            .then((data) => {
                data.forEach((doc) => {
                    batch.delete(db.doc(`/Comments/${doc.id}`));
                });
                return db
                    .collection('Likes')
                    .where('projectId', '==', projectId)
                    .get();
            })
            .then((data) => {
                data.forEach((doc) => {
                    batch.delete(db.doc(`/Likes/${doc.id}`));
                });
                return db
                    .collection('Notifications')
                    .where('projectId', '==', projectId)
                    .get();
            })
            .then((data) => {
                data.forEach((doc) => {
                    batch.delete(db.doc(`/Notifications/${doc.id}`));
                });
                return batch.commit();
            })
            .catch((err) => console.error(err));
    });