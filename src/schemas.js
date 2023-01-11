import joi from 'joi'

export const participants = joi.object({
    name: joi.string().required(),
});

export const messages = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().required().valid('message', 'private_message'),
});


// const user = { name: "Fulano", age: "20", email: "fulano@email.com" }

// const validation = userSchema.validate(user);


//const user = { name: "Fulano", age: "20", email: "fulano@email.com" }

//const validation = userSchema.validate(user, { abortEarly: true });

//if (validation.error) {
//  console.log(validation.error.details)
//}