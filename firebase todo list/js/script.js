// initialize materialize
document.addEventListener("DOMContentLoaded", function () {
  // side nav
  const sidenav = document.querySelector(".sidenav");
  M.Sidenav.init(sidenav);
  // modals
  const modals = document.querySelectorAll(".modal");
  M.Modal.init(modals);

  // drop down
  const dropdown = document.querySelector(".dropdown-trigger");
  M.Dropdown.init(dropdown, {
    alignment: "center",
    coverTrigger: false,
    hover: true,
    constrainWidth: false,
  });
});

// when the user clicks on the sign-up button
const signUpBtn = document.querySelector("#sign-up-btn");
if (signUpBtn) {
  signUpBtn.addEventListener("click", (e) => {
    const newUserEmail = document.querySelector("#sign-up-email").value;
    const newUserPassword = document.querySelector("#sign-up-password").value;
    e.preventDefault();
    const preloader = document.querySelector("#signup-preloader");
    const errorText = document.querySelector("#signup-error-text");
    preloader.style.display = "block";

    // create new user
    auth
      .createUserWithEmailAndPassword(newUserEmail, newUserPassword)
      .catch((err) => {
        errorText.innerHTML = err.message;
        errorText.style.display = "block";
        preloader.style.display = "none";
      })
      .then((credential) => {
        sendNewUserVerificationEmail(credential);
        if (credential) {
          db.collection("todos")
            .doc(credential.user.uid)

            .set({
              todos: [],
            })
            .then(() => {
              window.location.assign("todo.html");
            });
        }
      });
  });
}

function sendNewUserVerificationEmail(credential) {
  if (credential) {
    const user = credential.user;
    user.sendEmailVerification().then(() => {});
  }
}

// when the user clicks on the login button
const loginBtn = document.querySelector("#login-btn");
if (loginBtn) {
  loginBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const userEmail = document.querySelector("#login-email").value;
    const userPassword = document.querySelector("#login-password").value;
    const preloader = document.querySelector("#login-preloader");
    const errorText = document.querySelector("#login-error-text");
    preloader.style.display = "block";
    auth
      .signInWithEmailAndPassword(userEmail, userPassword)
      .then((credential) => {
        window.location.assign("todo.html");
      })
      .catch((err) => {
        errorText.innerHTML = err.message;
        errorText.style.display = "block";
        preloader.style.display = "none";
      });
  });
}

// when the user clicked the logout button in the nav and chose the "yes" option
const logoutBtn = document.querySelector("#logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", (e) => {
    auth.signOut();
  });
}

// when the user clicked the logout button in the nav but chose the "no" option
const dontLogoutBtns = document.querySelectorAll(".close-modal");
if (dontLogoutBtns) {
  dontLogoutBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      // close the modal
      const modal = document.querySelector("#logout-modal");
      M.Modal.getInstance(modal).close();
    });
  });
}

// listen for is user is signed in
auth.onAuthStateChanged((user) => {
  if (user) {
    showTodos(user);
    validateInput(user);
    showNotVerified(user);
  } else {
    if (window.location.href.includes("todo.html")) {
      window.location.assign("index.html");
    }
  }
});

function showNotVerified(user) {
  const text = document.querySelector(".not-verified");
  if (!user.emailVerified) {
    text.style.display = "block";
  }
}

function validateInput(user) {
  const addTodoBtn = document.querySelector("#add-todo-btn");
  addTodoBtn.addEventListener("click", () => {
    const inputText = document.querySelector("#input-text").value;
    if (inputText != "") {
      showConfirmation("Todo Successfully Added", "tick");
      addTodo(user, inputText);
    } else {
      showConfirmation("You need to add a todo item", "alert");
    }
  });
}

function showConfirmation(text, image) {
  const modal = document.querySelector("#confirmation");
  const confirmationText = document.querySelector("#confirmation-text");
  const confirmationImage = document.querySelector("#confirmation-img");
  confirmationText.innerHTML = text;
  confirmationImage.src = `../images/icons/${image}.png`;
  M.Modal.getInstance(modal).open();
}

// function for when a user adds a new todo item
function addTodo(user, inputText) {
  // show the preloader
  const preloader = document.querySelector("#preloader");
  preloader.style.display = "block";
  /* you cannot add duplicates to firestore arrays so first store the array in JS then 
      re-add the entire array*/
  let todoArr;
  const todoObj = { todoItem: inputText, checkedStatus: "no-check" };
  // save the data from firestore and add the new object to the array
  db.collection("todos")
    .doc(user.uid)
    .get()
    .then((doc) => {
      todoArr = doc.data().todos;
      todoArr.push(todoObj);
    })
    // update firestore with the new array
    .then(() => {
      db.collection("todos")
        .doc(user.uid)
        .set({
          todos: todoArr,
        })
        .then(() => {
          let inputText = document.querySelector("#input-text");
          let inputLabel = document.querySelector("#input-label");
          // clear the input value anf remove the materialze classes on the input and label
          inputText.value = "";
          inputLabel.classList.remove("active");
          inputText.classList.remove("valid");
          // update the UI list
          showTodos(user);
        });
    });
}

// function to show all the saved todo items
function showTodos(user) {
  let todoItems;
  let html = "";
  const list = document.querySelector("#list");
  const preloader = document.querySelector("#preloader");
  // preloader.style.display = "block";

  // get all the todo items from firestore
  db.collection("todos")
    .doc(user.uid)
    .get()
    .then((doc) => {
      todoItems = doc.data().todos;

      // create new html elements and add the todo items to the screen
      todoItems.forEach((item) => {
        html += `
        <li class="collection-item row valign-wrapper todo-item">
        <label class="col s10 m11">
        <input type="checkbox" ${item.checkedStatus} />
        <span>${item.todoItem}</span>
      </label>
      <a href="#!" class="secondary-content col s2 m1 btn delete-todo-btn"><i class="material-icons">delete</i></a>
      </li>
        `;
      });
      // remove the preloader
      if (preloader) {
        preloader.style.display = "none";
      }
      // update the UI
      list.innerHTML = html;

      // listener for a single todo item check
      const items = document.querySelectorAll(".todo-item");
      items.forEach((item, index) => {
        item.addEventListener("click", (e) => {
          savedCheckedTodoItems(item, user, index, e, todoItems);
        });
      });

      // listener for the check (select) all todo items button/input
      const selectAllBtn = document.querySelector("#select-all-checkbox");
      selectAllBtn.addEventListener("click", (e) => {
        selectAllTodoItems(user, e);
      });

      // listener for a single item delete
      const deleteTodoBtn = document.querySelectorAll(".delete-todo-btn");
      deleteTodoBtn.forEach((btn, index) => {
        btn.addEventListener("click", (e) => {
          deleteTodoItem(btn, index, user);
        });
      });

      // listener for the delete by batch btn
      const deleteAllBtn = document.querySelector("#delete-all-btn");
      deleteAllBtn.addEventListener("click", () => {
        deleteSelectedTodoItems(user);
      });
    });
}

// function to  delete a single todo item
function deleteTodoItem(btn, index, user) {
  // save the data from firestore
  let todoItems;
  db.collection("todos")
    .doc(user.uid)
    .get()
    .then((doc) => {
      todoItems = doc.data().todos;

      // delete the clicked item using the index on the delete btn(same index number)
      todoItems.splice(index, 1);
      // delete the ui element
      btn.parentElement.remove();
      // update firestore
      db.collection("todos").doc(user.uid).set({
        todos: todoItems,
      });
      showTodos(user);
    });
}

// select all todo items
function selectAllTodoItems(user, e) {
  const uiTodoItems = document.querySelectorAll(".todo-item");
  let todoItems;
  if (e.target.checked == true) {
    //check UI items
    uiTodoItems.forEach((item) => {
      item.firstElementChild.firstElementChild.checked = true;
    });
    // get the todos from firestore
    db.collection("todos")
      .doc(user.uid)
      .get()
      .then((doc) => {
        todoItems = doc.data().todos;
        //update array
        todoItems.forEach((item) => {
          item.checkedStatus = "checked";
        });
        // update all firestore docs
        db.collection("todos").doc(user.uid).set({
          todos: todoItems,
        });
      });
  } else {
    //check UI items
    uiTodoItems.forEach((item) => {
      item.firstElementChild.firstElementChild.checked = false;
    });
    // get the todos from firestore
    db.collection("todos")
      .doc(user.uid)
      .get()
      .then((doc) => {
        todoItems = doc.data().todos;
        //update array
        todoItems.forEach((item) => {
          item.checkedStatus = "no-check";
        });
        // update all firestore docs
        db.collection("todos").doc(user.uid).set({
          todos: todoItems,
        });
      });
  }
}

function deleteSelectedTodoItems(user) {
  const selectAllBtn = document.querySelector("#select-all-checkbox");
  const uiTodoItems = document.querySelectorAll(".todo-item");
  let todoItems;
  db.collection("todos")
    .doc(user.uid)
    .get()
    .then((doc) => {
      todoItems = doc.data().todos;
      // create a new array with only the unchecked items
      const newItems = todoItems.filter((item) => {
        return item.checkedStatus != "checked";
      });
      // update the todoItems array
      todoItems = newItems;
      // remove the todo items from the UI
      uiTodoItems.forEach((item) => {
        if (item.firstElementChild.firstElementChild.checked == true) {
          item.remove();
        }
      });
      // update firestore
      db.collection("todos").doc(user.uid).set({
        todos: todoItems,
      });
      selectAllBtn.checked = false;
      showTodos(user);
    });

  // return todoItems;
}

function savedCheckedTodoItems(item, user, index, e) {
  // save the data from firestore
  let todoItems;
  db.collection("todos")
    .doc(user.uid)
    .get()
    .then((doc) => {
      todoItems = doc.data().todos;
      // if the UI item is checked (ticked)
      if (e.target.checked == true) {
        // update the array using the index of the clicked UI (same index number)
        todoItems[index].checkedStatus = "checked";
        // update firestore
        db.collection("todos").doc(user.uid).set({
          todos: todoItems,
        });
        // if the UI item is not checked (ticked)
      } else if (e.target.checked == false) {
        todoItems[index].checkedStatus = "no-check";
        db.collection("todos").doc(user.uid).set({
          todos: todoItems,
        });
      }
    });
}
