const express = require("express")
const mongoose = require("mongoose")  //Object Data Modeling library for MongoDB
const session = require("express-session")
const bcrypt = require("bcrypt")

const app = express();

app.set("view engine", "ejs"); // Use EJS as template engine

mongoose
  .connect("mongodb://localhost:27017/Mongo-crud", {
    useNewUrlParser: true, //indicate-want to use the new URL parser
    useUnifiedTopology: true, 
  })
  .then(() => {
    console.log("connected to mongoDb");
  });

app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "My-secret-key",
    resave: true,
    saveUninitialized: true,
  })
)

const User = mongoose.model("User", {
  username: String,
  email: String,
  password: String,
});


// Route
app.get("/", (req, res) => {
  if (req.session.user) {
    res.redirect("/home");
  } else {
    res.redirect("/login");
  }
})

app.get("/login", (req, res) => {
  res.render("login", { userNotexist: " " });
})

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      // If user does not exist
      return res.render("login", {
        userNotexist: "User does not exist, Please sign up.",
      })
    }

    if (user && (await bcrypt.compare(password, user.password))) {
      req.session.user = user;
      res.redirect("/home");
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/signup", (req, res) => {
  res.render("signup", { userNameAlready: " " });
})

app.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Checking a user with the same username already exists
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      // If the username already exists
      return res.render("signup", {
        userNameAlready: "Username already taken",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    req.session.user = await User.findOne({ username });

    res.redirect("/home");
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
})

app.get("/home", (req, res) => {
  const user = req.session.user;

  if (user) {
    res.render("home", { username: user.username, email: user.email });
  } else {
    res.redirect("/login");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

// Edit route
app.get("/edit", (req, res) => {
  const user = req.session.user;

  if (user) {
    res.render("edit", { user });
  } else {
    res.redirect("/login");
  }
});


// form submission for editing user details
app.post("/edit", async (req, res) => {
  try {
    const { newUsername, newEmail, newPassword } = req.body;

    const userId = req.session.user._id; // Extract userid from session

    // user from database using the ID
    const user = await User.findById(userId);


    if (user) {
      // Update the user details in the database
      user.username = newUsername;
      user.email = newEmail;

      // If a new password is provided, hash and update it
      if (newPassword) {
        user.password = await bcrypt.hash(newPassword, 10);
      }

      // Save-updated user details
      await user.save()

      // Update session with new user information
      req.session.user = await User.findById(userId);

      // Redirect to the home page after editing
      res.redirect("/home")

    } else {
      res.redirect("/login");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// Delete route
app.get("/delete", async (req, res) => {
  try {
    const userId = req.session.user._id; // userid from session

    // Delete the user from the database using the ID
    await User.findByIdAndDelete(userId);

    req.session.destroy(); // Destroy the session
    res.redirect("/signup");
  } catch (error) {
    console.error(error)
    res.status(500).send("Internal Server Error");
  }
});

app.listen(3001, () => {
  console.log("Server is running on http://localhost:3001");
});
