import joi from 'joi'

export const participants = joi.object({
    name: joi.string().required(),
});

export const messagesBody = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().required().valid('message', 'private_message'),
});

export const messagesHeaderUser = joi.string().required();
