const { db } = require("../util/admin");

/*exports.getAllProjects = (req, res) => {
    db.collection("Projects")
        .orderBy("createdAt", "desc")
        .get()
        .then(data => {
            let projects = [];
            data.forEach((doc) => {
                projects.push({
                    projectId: doc.id,
                    userHandle: doc.data().userHandle,
                    title: doc.data().title,
                    description: doc.data().description,
                    urlContent: doc.data().urlContent,
                    createdAt: doc.data().createdAt,
                    userImage: doc.data().userImage,
                    commentCount: doc.data().commentCount,
                    likeCount: doc.data().likeCount,
                });
            });
            return res.json(projects);
        })
        .catch((error) => console.log("Error: " + error));
};*/

exports.getAllProjects = (req, res) => {

    let query = db.collection('Projects').orderBy("createdAt", "desc");

    query.onSnapshot(querySnapshot => {
        let projects = [];
        querySnapshot.forEach((doc) => {
            projects.push({
                projectId: doc.id,
                userHandle: doc.data().userHandle,
                title: doc.data().title,
                description: doc.data().description,
                urlContent: doc.data().urlContent,
                createdAt: doc.data().createdAt,
                userImage: doc.data().userImage,
                commentCount: doc.data().commentCount,
                likeCount: doc.data().likeCount,
            });
        });
        return res.json(projects);
    }, err => {
        console.log(`Encountered error: ${err}`);
    });
};

exports.createProject = (req, res) => {

    if(req.body.title.trim() === ''){
        return res.status(500).json({ error: "Titulo vacio" });
    }

    const newProject = {
        title: req.body.title,
        userHandle: req.user.handle,
        description: req.body.description,
        urlContent: req.body.urlContent,
        necessaryTrash: req.body.necessaryTrash,
        trashType: req.body.trashType,
        complexity: req.body.complexity,
        createdAt: new Date().toISOString(),
        userImage: req.user.imageUrl,
        likeCount: 0,
        commentCount: 0
    };

    db.collection("Projects")
        .add(newProject)
        .then((doc) => {
            const resProject = newProject;
            resProject.projectId = doc.id;
            //res.json({ message: `Project ${doc.id} created succesfully` });
            res.json(resProject);
        })
        .catch(err => {
            res.status(500).json({ error: "Something went wrong" });
            console.log(err);
        });
};

//Get one project
exports.getProject = (req, res) => {
    let projectData = {};

    db.doc(`/Projects/${req.params.projectId}`)
        .get()
        .then((doc) => {
            if(!doc.exists) {
                return res.status(404).json({ error: "Project not found" });
            }
            projectData = doc.data();
            projectData.projectId = doc.id;
            return db
                .collection('Comments')
                .orderBy('createdAt', 'desc')
                .where('projectId', '==', req.params.projectId)
                .get()
        })
        .then((data) => {
            projectData.comments = [];
            data.forEach((doc) => {
                projectData.comments.push(doc.data());
            });
            return res.json(projectData);
        })
        .catch((err) => {
            console.log(err);
            res.status(500).json({ error: err.code });
        })
};

//Comment a project

exports.commentOnProject = (req, res) => {
    if(req.body.body.trim() === '') return res.status(400).json({ comment: "Must be not empty" });

    const newComment = {
        body: req.body.body,
        createdAt: new Date().toISOString(),
        projectId: req.params.projectId,
        userHandle: req.user.handle,
        userImage: req.user.imageUrl
    };

    db.doc(`/Projects/${req.params.projectId}`)
        .get()
        .then(doc => {
            if(!doc.exists) {
                return res.status(404).json({ error: 'Project not found' });
            }
            //return db.collection('Comments').add(newComment);
            const commentCount = doc.data().commentCount + 1;
            return doc.ref.update({ commentCount: commentCount });
        })
        .then(() => {
            return db.collection('Comments').add(newComment);
        })
        .then(() => {
            res.json(newComment);
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({ error: 'Something went wrong' });
        })
};

//Like a project

exports.likeProject = (req, res) => {
    const likeDocument = db
        .collection('Likes')
        .where('userHandle', '==', req.user.handle)
        .where('projectId', '==', req.params.projectId).limit(1);

    const projectDocument = db
        .doc(`/Projects/${req.params.projectId}`);

    let projectData;

    projectDocument
        .get()
        .then(doc => {
            if(doc.exists){
                projectData = doc.data();
                projectData.projectId = doc.id;
                return db
                    .collection('Comments')
                    .orderBy('createdAt', 'desc')
                    .where('projectId', '==', req.params.projectId)
                    .get()
            }
            else {
                return res.status(404).json({ error: 'Project not found' });
            }
        })
        .then((data) => {
            projectData.comments = [];
            data.forEach((doc) => {
                projectData.comments.push(doc.data());
            });
            return likeDocument.get();
        })
        .then(data => {
            if(data.empty){
                return db.collection('Likes').add({
                    projectId: req.params.projectId,
                    userHandle: req.user.handle
                })
                .then(() => {
                    projectData.likeCount++;
                    return projectDocument.update({
                        likeCount: projectData.likeCount
                    });
                })
                .then(() => {
                    return res.json(projectData);
                })
            }
            else {
                return res.status(400).json({ error: 'Project already liked' });
            }
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({ error: err.code });
        })

};

//Unlike project

exports.unlikeProject = (req, res) => {
    const likeDocument = db
        .collection('Likes')
        .where('userHandle', '==', req.user.handle)
        .where('projectId', '==', req.params.projectId).limit(1);

    const projectDocument = db.doc(`/Projects/${req.params.projectId}`);

    let projectData;

    projectDocument
        .get()
        .then(doc => {
            if(doc.exists){
                projectData = doc.data();
                projectData.projectId = doc.id;
                return db
                    .collection('Comments')
                    .orderBy('createdAt', 'desc')
                    .where('projectId', '==', req.params.projectId)
                    .get()
            } 
            else {
                return res.status(404).json({ error: 'Project not found' });
            }
        })
        .then((data) => {
            projectData.comments = [];
            data.forEach((doc) => {
                projectData.comments.push(doc.data());
            });
            return likeDocument.get();
        })
        .then(data => {
            if(data.empty){
                return res.status(400).json({ error: 'Project not liked' });
            }
            else {
                return db.doc(`/Likes/${data.docs[0].id}`).delete()
                    .then(() => {
                        projectData.likeCount--;
                        return projectDocument.update({ likeCount: projectData.likeCount });
                    })
                    .then(() => {
                        return res.json(projectData);
                    })
            }
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({ error: err.code });
        })
};

//Delete project
exports.deleteProject = (req, res) => {
    const document = db.doc(`/Projects/${req.params.projectId}`);
    const docStatUser = db.collection('Users').doc(req.user.handle);

    document
        .get()
        .then((doc) => {
            if(!doc.exists){
                return res.status(400).json({ error: 'Project not found' });
            }
            if(doc.data().userHandle !== req.user.handle){
                return res.status(403).json({ error: `Unauthorized ${doc.data().userHandle} req: ${req.user.handle}` });
            }
            else{
                docStatUser
                    .get()
                    .then(doc => {
                        if (!doc.exists) {
                            return res.status(400).json({error: 'Stat branch not found'});
                        } else {
                            let nuevoTotalProjects;
                            nuevoTotalProjects = doc.data().totalProjects - 1;
                            docStatUser.update({totalProjects: nuevoTotalProjects});
                        }
                    });
                return document.delete();
            }
        })
        .then(() => {
            res.json({ message: 'Project deleted succesfully' });
        })
        .catch(err => {
            console.log(err);
            return res.status(500).json({ error: err.code });
        });
};

