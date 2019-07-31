const isEmail = (email) => {
    const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (email.match(emailRegEx)) return true; else return false;
}
const isEmpty = (string) => {
    if (string.trim() === '') return true; else return false;
}

//Validation signUp

exports.validateSignupData = (data) => {

    let errors = {};

    if (isEmpty(data.email)) {
        errors.email = 'Must not be empty';
    } else if (!isEmail(data.email)) {
        errors.email = 'Must be a valid email address';
    }

    if (isEmpty(data.password)) errors.password = 'Must not be empty';
    if (data.password !== data.confirmPassword)
        errors.confirmPassword = 'Passwords must match';
    if (isEmpty(data.userHandle)) errors.handle = 'Must not be empty';

    return {
        errors,
        valid: Object.keys(errors).length === 0 ? true : false
    }
}

exports.validateLoginData = (data) => {
    let errors = {};
    //return res.status(200).json(data);
    if (isEmpty(data.email)) errors.email = 'Email must not be empty';
    if (isEmpty(data.password)) errors.password = 'Password must not be empty';

    return{
        errors,
        valid: Object.keys(errors).length === 0 ? true : false
    }
}

exports.reduceUserDetails = (data) => {
    let userDetails = {};

    if(!isEmpty(data.bio.trim())) userDetails.bio = data.bio;
    if(!isEmpty(data.direccion.trim())) userDetails.direccion = data.direccion;
    if(!isEmpty(data.ciudad.trim())) userDetails.ciudad = data.ciudad;
    if(!isEmpty(data.pais.trim())) userDetails.pais = data.pais;
    if(!isEmpty(data.cp.trim())) userDetails.cp = data.cp;
    if(!isEmpty(data.nombre.trim())) userDetails.nombre = data.nombre;
    if(!isEmpty(data.apellido.trim())) userDetails.apellido = data.apellido;

    return userDetails;
}