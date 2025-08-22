import React, { useEffect, useState } from "react";

function Projects() {
    const [projects, setProjects] = useState([]);
    const [newProjectName, setProjectName] = useState("");

    // Load projects from backend
    useEffect(() => {
        fetch("/api/projects/") // adjust to your backend URL
        .then(res => res.json())
        .then(data => setProjects(data));
    }, []);

    // Create a new project
    const createProject = async () => {
        // asking django to create a project through this URL
        const result = await fetch("api/projects/", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({title: newProjectName}) // we are creating with this title (if model, has required fields that are not specified here, it will 400 error)
        });
        if (result.ok) {
            const newProject = await result.json();
            setProjects([...projects, newProject]); // adding previous projects with this new project
        }
    }

    // Delete a project
    const deleteProject = async (id) => {
        const result = await fetch(`/api/projects/${id}/`, { 
            method: "DELETE" 
        });
        if (result.ok) {
            setProjects(projects.filter(p => p.id !== id)); // what are the actual IDs and do they get reset after deleting?
        }
    };

    return (
        <div className = "Project Header">
            <h1>Projects</h1>
            <input
                value={newProjectName}
                placeholder={"Project Name"}
                onChange={(e) => setProjectName(e.target.value)}
            />

            {/* Callback function because we need to pass the project id */}
            <button onClick={() => createProject()}>
                Create Project
            </button>

            <ul>
                {projects.map(p => (
                    <li key = {p.id}>
                        <span>{p.title}</span>
                        <button onClick={() => deleteProject(p.id)}> Delete </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default Projects