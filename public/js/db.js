// This works on all devices/browsers, and uses IndexedDBShim as a final fallback
var indexedDB =
  window.indexedDB ||
  window.mozIndexedDB ||
  window.webkitIndexedDB ||
  window.msIndexedDB ||
  window.shimIndexedDB;

let db;
let dbReq = indexedDB.open("budget", 1);
dbReq.onupgradeneeded = function (event) {
  // Set the db variable to our database so we can use it!
  db = event.target.result;

  // Create an object store named notes. Object stores
  // in databases are where data are stored.
  let notes = db.createObjectStore("transactions", { autoIncrement: true });
};

dbReq.onsuccess = function (event) {
  db = event.target.result;
};

dbReq.onerror = function (event) {
  alert("error opening database " + event.target.errorCode);
};

// Function to add a transaction to indexedDB for offline
const addTransaction = (db, transaction) => {
  // Start a database transaction and get the notes object store
  let tx = db.transaction(["transactions"], "readwrite");
  let store = tx.objectStore("transactions");

  store.add(transaction);

  // Wait for the database transaction to complete
  tx.oncomplete = function () {
    console.log("stored transaction!");
  };
  tx.onerror = function (event) {
    alert("error storing transaction " + event.target.errorCode);
  };
};

// Function to sync indexedDB to online DB
const syncTransactions = (db) => {
  let tx = db.transaction(["transactions"], "readwrite");
  let store = tx.objectStore("transactions");

  let req = store.openCursor();
  let allTransactions = [];

  req.onsuccess = function (event) {
    // The result of req.onsuccess is an IDBCursor
    let cursor = event.target.result;
    if (cursor != null) {
      allTransactions.push(cursor.value);
      cursor.continue();
    } else {
      // save to mongo
      fetch("/api/transaction/bulk", {
        method: "POST",
        body: JSON.stringify(allTransactions),
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
        },
      }).then((response) => {
        // clear indexedDB after sync
        clearData(db);
        // refresh screen after sync
        fetch("/api/transaction")
          .then((response) => {
            return response.json();
          })
          .then((data) => {
            // save db data on global variable
            transactions = data;

            populateTotal();
            populateTable();
            populateChart();
          });
      });
    }
  };
  req.onerror = function (event) {
    alert("error in cursor request " + event.target.errorCode);
  };
};

// function to clear indexedDB
const clearData = (db) => {
  // open a read/write db transaction, ready for clearing the data
  var transaction = db.transaction(["transactions"], "readwrite");

  // report on the success of the transaction completing, when everything is done
  transaction.oncomplete = function (event) {
    console.log("Store clear completed");
  };

  transaction.onerror = function (event) {
    console.log("Store clear error");
  };

  // create an object store on the transaction
  var objectStore = transaction.objectStore("transactions");

  // Make a request to clear all the data out of the object store
  var objectStoreRequest = objectStore.clear();

  objectStoreRequest.onsuccess = function (event) {
    console.log("Store clear success");
  };
};
