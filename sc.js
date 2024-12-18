let userType = "normal";
let taskData = [];
let currentEditTask = null;
let currentListId = null;

const modalOverlay = document.getElementById('modal-overlay');
const modal = document.getElementById('modal');
const taskForm = document.getElementById('task-form');
const completedContainer = document.getElementById('completed-container');
const flip = document.getElementById("flip");

document.addEventListener("DOMContentLoaded", () => {
  fetchLists();
});

function fetchLists() {
  fetch('/Taskatk/api/lists.php/')
    .then(response => response.json())
    .then(data => {
      // Transform object into an array
      taskData = Object.values(data);
      renderLists();
    })
    .catch(err => console.error("Error fetching lists:", err));
}

function renderLists() {
  const container = document.getElementById("lists-container");
  container.innerHTML = "";

  taskData.forEach(list => {
    const listElement = document.createElement("div");
    listElement.className = "cont";
    listElement.id = list.id;

    listElement.innerHTML = `
      <div class="grid">
        <div class="list-name">
          <h3>${list.name}</h3>
        </div>
        <button class="trash" onclick="removeList('${list.id}')">
          <img src="css/trash.png" alt="Trash Icon" width="17" height="17">
        </button>
      </div>
      <div id="tasks-${list.id}"></div>
      <button class="add-button" onclick="openCreateTaskModal('${list.id}')">
        Create Task
        <img src="css/plus.png" alt="Icon" width="17" height="17">
      </button>
    `;

    const tasksContainer = listElement.querySelector(`#tasks-${list.id}`);
    (list.tasks || []).forEach(task => {
      if (!task.completed) {
        const taskElement = document.createElement("div");
        taskElement.className = "task";
        taskElement.id = task.id;

        taskElement.innerHTML = `
          <input type="checkbox" ${task.completed ? "checked" : ""} onchange="toggleTaskCompletion('${list.id}', '${task.id}', this.checked)">
          <span>${task.name}</span>
          <button onclick="openTaskInfo('${list.id}', '${task.id}')">
            info
          </button>
        `;

        tasksContainer.appendChild(taskElement);
      }
    });

    container.appendChild(listElement);
  });

  renderCompletedTasks();
}

function renderCompletedTasks() {
  completedContainer.innerHTML = "";

  taskData.forEach(list => {
    (list.tasks || [])
      .filter(task => task.completed)
      .forEach(task => {
        const taskElement = document.createElement("div");
        taskElement.className = "completed-task";
        taskElement.id = task.id;

        taskElement.innerHTML = `
          <span>${task.name}</span>
          <button onclick="removeCompletedTask('${list.id}', '${task.id}')" class="trash">
            <img src="css/trash.png" alt="Trash Icon" width="17" height="17">
          </button>
        `;

        completedContainer.appendChild(taskElement);
      });
  });
}

function addList() {
  const listName = prompt("Enter list name:");
  if (!listName) return;

  fetch('/Taskatk/api/lists.php/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ list_name: listName })
  })
  .then(response => response.json())
  .then(data => {
    if (data.list_id) {
      taskData.push({ id: data.list_id, name: listName, tasks: [] });
      renderLists();
    } else {
      console.error("Error creating list:", data);
    }
  })
  .catch(err => console.error("Error adding list:", err));
}

function openCreateTaskModal(listId) {
  currentListId = listId;
  currentEditTask = null;
  document.getElementById('modal-title').innerText = "Create Task";
  taskForm.reset();
  showModal();
}

function showModal() {
  modalOverlay.classList.remove('hidden');
  modal.classList.remove('hidden');
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  modal.classList.add('hidden');
}

function handleTaskFormSubmit(event) {
  event.preventDefault();
  const taskName = document.getElementById('task-name').value;
  const dueDate = document.getElementById('task-due-date').value;
  const description = document.getElementById('task-description').value;

  if (currentEditTask) {
    updateTask(currentEditTask, taskName, dueDate, description);
  } else {
    createTask(currentListId, taskName, dueDate, description);
  }
  closeModal();
}

function createTask(listId, name, dueDate, description) {
  fetch('/Taskatk/api/tasks.php/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ list_id: listId, name, due_date: dueDate, description })
  })
  .then(response => response.json())
  .then(data => {
    if (data.task_id) {
      const list = taskData.find(l => l.id === listId);
      list.tasks = list.tasks || [];
      list.tasks.push({ id: data.task_id, name, due_date: dueDate, description, completed: false });
      renderLists();
    } else {
      console.error("Error creating task:", data);
    }
  })
  .catch(err => console.error("Error creating task:", err));
}

function toggleTaskCompletion(listId, taskId, isCompleted) {
  fetch('/Taskatk/api/tasks.php/edit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id: taskId, flg_completed: isCompleted ? 1 : 0 })
  })
  .then(() => {
    const list = taskData.find(l => l.id === listId);
    const task = list.tasks.find(t => t.id === taskId);
    if (task) {
      task.completed = isCompleted;
    }
    renderLists();
  })
  .catch(err => console.error("Error toggling task completion:", err));
}

function removeCompletedTask(listId, taskId) {
  fetch(`/Taskatk/api/tasks.php?id=${taskId}`, {
    method: 'DELETE',
  })
  .then(() => {
    const list = taskData.find(l => l.id === listId);
    list.tasks = list.tasks.filter(task => task.id !== taskId);
    renderLists();
  })
  .catch(err => console.error("Error removing completed task:", err));
}

function openTaskInfo(listId, taskId) {
  const list = taskData.find(l => l.id === listId);
  const task = list.tasks.find(t => t.id === taskId);
  currentListId = listId;
  currentEditTask = task;

  document.getElementById('modal-title').innerText = "Task Info";
  document.getElementById('task-name').value = task.name;
  document.getElementById('task-due-date').value = task.due_date;
  document.getElementById('task-description').value = task.description;

  showModal();
}

function updateTask(task, name, dueDate, description) {
  fetch('/Taskatk/api/tasks.php/edit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id: task.id, name, due_date: dueDate, description })
  })
  .then(() => {
    task.name = name;
    task.due_date = dueDate;
    task.description = description;
    renderLists();
  })
  .catch(err => console.error("Error updating task:", err));
}

function removeList(listId) {
  if (confirm('Are you sure you want to remove this list?')) {
    fetch(`/Taskatk/api/lists.php?id=${listId}`, {
      method: 'DELETE',
    })
    .then(() => {
      taskData = taskData.filter(list => list.id !== listId);
      renderLists();
    })
    .catch(err => console.error("Error removing list:", err));
  }
}

function showCompleted() {
  if (completedContainer.className === "show") {
    completedContainer.className = "hide";
    flip.className = "not-flipped";
  } else {
    completedContainer.className = "show";
    flip.className = "flip";
  }
}
