import joi from 'joi';

export const schParticipants = joi.object({
  name: joi.string().required().invalid('Todos'),
});

export const schMessagesBody = joi.object({
  to: joi.string().required(),
  text: joi.string().required(),
  type: joi.string().required().valid('message', 'private_message'),
});

export const schHeaderUser = joi.string().required();
