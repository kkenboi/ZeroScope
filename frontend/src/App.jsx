// import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  // // This does once only
  useEffect (() => {
    fetchUsers();
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/users/");
      const data = await response.json()
      console.log(data);

      setUsers(data);
    } catch (err) {
      console.log(err);
    }
  }

  const addUser = async () => {
    const userData = {
      name: name,
      password: password
    };
    try{
      const response = await fetch("http://127.0.0.1:8000/api/users/create/", {
        method: "POST", 
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });
      const data = await response.json();
      setUsers((prevUsers) => [...prevUsers, data]);
      setName("");
      setPassword("");
      console.log(data);
    }
    catch (err) {
      console.log(err);
    }
  }

  return (
    <>
      <h1>List of Users</h1>
    
      <div>
        <input type="text" placeholder="Username" onChange={(e) => setName(e.target.value)} />
        <input type="text" placeholder="Password" onChange={(e) => setPassword(e.target.value)}/>
        <button onClick = { addUser }> Sign Up </button>
      </div>
      {users.map((user) => (
        <div>
          <p>User: {user.name}</p>
          <p>Password: {user.password}</p>
        </div>
      ))}
    </>
  );
}

export default App
