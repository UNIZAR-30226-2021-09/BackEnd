const nodemailer = require('nodemailer');
transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: 'ps09unizar@gmail.com', // generated ethereal user
      pass: 'xdehxyjjgirltwfi', // generated ethereal password
    },
  });
