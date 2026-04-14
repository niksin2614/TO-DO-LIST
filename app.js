import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// Firebase config section:
// Replace these values if you connect a different Firebase project.
const firebaseConfig = {
  apiKey: "AIzaSyBLANJ06rUdrZvSOtEQdl2T4ILOpl_ry6c",
  authDomain: "to-do-list-4457a.firebaseapp.com",
  projectId: "to-do-list-4457a",
  storageBucket: "to-do-list-4457a.firebasestorage.app",
  messagingSenderId: "815959359099",
  appId: "1:815959359099:web:75cc7b301f2e2f2cbaacde",
  measurementId: "G-CVT0TXH2P8",
};

const PRIORITIES = ["High", "Medium", "Low"];
const CATEGORIES = ["Work", "Study", "Personal"];
const THEME_STORAGE_KEY = "momentum-theme";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const elements = {
  bootLoading: document.getElementById("boot-loading"),
  authView: document.getElementById("auth-view"),
  appView: document.getElementById("app-view"),
  authForm: document.getElementById("auth-form"),
  authTitle: document.getElementById("auth-title"),
  authSubmit: document.getElementById("auth-submit"),
  authSubmitLabel: document.getElementById("auth-submit-label"),
  authSubmitSpinner: document.getElementById("auth-submit-spinner"),
  email: document.getElementById("email"),
  password: document.getElementById("password"),
  loginTab: document.getElementById("login-tab"),
  signupTab: document.getElementById("signup-tab"),
  message: document.getElementById("message"),
  themeToggle: document.getElementById("theme-toggle"),
  themeToggleLabel: document.getElementById("theme-toggle-label"),
  logoutBtn: document.getElementById("logout-btn"),
  logoutLabel: document.getElementById("logout-label"),
  logoutSpinner: document.getElementById("logout-spinner"),
  userEmail: document.getElementById("user-email"),
  taskForm: document.getElementById("task-form"),
  taskInput: document.getElementById("task-input"),
  taskPriority: document.getElementById("task-priority"),
  taskCategory: document.getElementById("task-category"),
  taskDueDate: document.getElementById("task-due-date"),
  taskSubmit: document.getElementById("task-submit"),
  taskSubmitLabel: document.getElementById("task-submit-label"),
  taskSubmitSpinner: document.getElementById("task-submit-spinner"),
  totalCount: document.getElementById("total-count"),
  completedCount: document.getElementById("completed-count"),
  pendingCount: document.getElementById("pending-count"),
  searchInput: document.getElementById("search-input"),
  filterButtons: Array.from(document.querySelectorAll(".filter-button")),
  resultsSummary: document.getElementById("results-summary"),
  listLoading: document.getElementById("list-loading"),
  taskSkeleton: document.getElementById("task-skeleton"),
  taskList: document.getElementById("task-list"),
  emptyState: document.getElementById("empty-state"),
};

const state = {
  authMode: "login",
  currentUser: null,
  unsubscribeTasks: null,
  authResolved: false,
  authLoading: false,
  latestTasks: [],
  editingTaskId: null,
  searchTerm: "",
  statusFilter: "all",
  theme: "light",
};

const pendingTaskIds = new Set();
const editDrafts = new Map();

function isFirebaseConfigured() {
  return Object.values(firebaseConfig).every(
    (value) => value && !String(value).includes("YOUR_")
  );
}

function showMessage(text, type = "info") {
  elements.message.textContent = text;
  elements.message.className = `message show ${type}`;
}

function clearMessage() {
  elements.message.textContent = "";
  elements.message.className = "message";
}

function normalizeTaskText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function todayIsoDate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0];
}

function syncDueDateInputToToday() {
  const today = todayIsoDate();
  elements.taskDueDate.value = today;
  elements.taskDueDate.min = today;
  elements.taskDueDate.max = today;
}

function validateEmail(email) {
  if (!email) {
    return "Email is required.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Enter a valid email address.";
  }

  return "";
}

function validatePassword(password) {
  if (!password) {
    return "Password is required.";
  }

  if (password.length < 6) {
    return "Password must be at least 6 characters.";
  }

  return "";
}

function validateTaskPayload(task) {
  const text = normalizeTaskText(task.text || "");
  if (!text) {
    return "Task name cannot be empty.";
  }

  if (text.length > 120) {
    return "Task name must be 120 characters or fewer.";
  }

  if (!PRIORITIES.includes(task.priority)) {
    return "Choose a valid priority.";
  }

  if (!CATEGORIES.includes(task.category)) {
    return "Choose a valid category.";
  }

  if (task.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)) {
    return "Choose a valid due date.";
  }

  return "";
}

function hydrateTask(id, rawTask) {
  return {
    id,
    text: typeof rawTask.text === "string" ? rawTask.text : "Untitled task",
    completed: Boolean(rawTask.completed),
    createdAt: rawTask.createdAt ?? null,
    priority: PRIORITIES.includes(rawTask.priority) ? rawTask.priority : "Medium",
    category: CATEGORIES.includes(rawTask.category) ? rawTask.category : "Personal",
    dueDate: typeof rawTask.dueDate === "string" ? rawTask.dueDate : "",
  };
}

function formatCreatedAt(timestamp) {
  if (!timestamp || typeof timestamp.toDate !== "function") {
    return "Created just now";
  }

  const formatted = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp.toDate());

  return `Created ${formatted}`;
}

function formatDueDate(dueDate) {
  if (!dueDate) {
    return "";
  }

  const formatted = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${dueDate}T00:00:00`));

  return `Due ${formatted}`;
}

function isOverdue(task) {
  return Boolean(task.dueDate) && !task.completed && task.dueDate < todayIsoDate();
}

function getPriorityClass(priority) {
  return priority.toLowerCase();
}
function setBootLoading(isLoading) {
  elements.bootLoading.classList.toggle("hidden", !isLoading);
}

function setInlineButtonState(button, label, spinner, isLoading, idleText, loadingText) {
  button.disabled = isLoading;
  label.textContent = isLoading ? loadingText : idleText;
  if (spinner) {
    spinner.classList.toggle("hidden", !isLoading);
  }
}

function setAuthLoading(isLoading) {
  state.authLoading = isLoading;
  const idleText = state.authMode === "login" ? "Login" : "Sign Up";
  const loadingText =
    state.authMode === "login" ? "Logging In..." : "Creating Account...";

  elements.email.disabled = isLoading;
  elements.password.disabled = isLoading;
  elements.loginTab.disabled = isLoading;
  elements.signupTab.disabled = isLoading;
  setInlineButtonState(
    elements.authSubmit,
    elements.authSubmitLabel,
    elements.authSubmitSpinner,
    isLoading,
    idleText,
    loadingText
  );
}

function setTaskSubmitting(isLoading) {
  elements.taskInput.disabled = isLoading;
  elements.taskPriority.disabled = isLoading;
  elements.taskCategory.disabled = isLoading;
  elements.taskDueDate.disabled = isLoading;
  setInlineButtonState(
    elements.taskSubmit,
    elements.taskSubmitLabel,
    elements.taskSubmitSpinner,
    isLoading,
    "Add Task",
    "Adding..."
  );
}

function setLogoutLoading(isLoading) {
  setInlineButtonState(
    elements.logoutBtn,
    elements.logoutLabel,
    elements.logoutSpinner,
    isLoading,
    "Logout",
    "Logging Out..."
  );
}

function setTaskListLoading(isLoading) {
  elements.listLoading.classList.toggle("hidden", !isLoading);
  elements.taskSkeleton.classList.toggle("hidden", !isLoading);
  elements.taskList.classList.toggle("hidden", isLoading);
  if (isLoading) {
    elements.emptyState.style.display = "none";
  }
}

function syncTaskItemState(taskId) {
  const taskItem = elements.taskList.querySelector(`[data-task-id="${taskId}"]`);
  if (!taskItem) {
    return;
  }

  const isPending = pendingTaskIds.has(taskId);
  taskItem.classList.toggle("pending", isPending);
  taskItem.querySelectorAll("input, button, select").forEach((control) => {
    control.disabled = isPending;
  });
}

function setTaskPending(taskId, isPending) {
  if (isPending) {
    pendingTaskIds.add(taskId);
  } else {
    pendingTaskIds.delete(taskId);
  }
  syncTaskItemState(taskId);
}

// Theme preference stays in localStorage so the UI remembers the last choice.
function setTheme(theme) {
  state.theme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = state.theme;
  localStorage.setItem(THEME_STORAGE_KEY, state.theme);
  elements.themeToggleLabel.textContent =
    state.theme === "dark" ? "Light Mode" : "Dark Mode";
}

function initializeTheme() {
  setTheme(localStorage.getItem(THEME_STORAGE_KEY) || "light");
}

function toggleTheme() {
  setTheme(state.theme === "dark" ? "light" : "dark");
}

function setAuthMode(mode) {
  state.authMode = mode;
  const isLogin = mode === "login";

  elements.authTitle.textContent = isLogin ? "Welcome back" : "Create your account";
  elements.loginTab.classList.toggle("active", isLogin);
  elements.signupTab.classList.toggle("active", !isLogin);
  if (!state.authLoading) {
    elements.authSubmitLabel.textContent = isLogin ? "Login" : "Sign Up";
  }
  clearMessage();
}

function resetTaskComposer() {
  elements.taskForm.reset();
  elements.taskPriority.value = "Medium";
  elements.taskCategory.value = "Personal";
  syncDueDateInputToToday();
}

function clearEditingState() {
  state.editingTaskId = null;
  editDrafts.clear();
}

function setSignedOutView() {
  elements.authView.classList.remove("hidden");
  elements.appView.classList.add("hidden");
  elements.taskList.innerHTML = "";
  elements.taskList.classList.remove("hidden");
  elements.taskSkeleton.classList.add("hidden");
  elements.listLoading.classList.add("hidden");
  elements.emptyState.style.display = "none";
  elements.userEmail.textContent = "-";
  elements.totalCount.textContent = "0";
  elements.completedCount.textContent = "0";
  elements.pendingCount.textContent = "0";
  elements.resultsSummary.textContent = "Showing 0 tasks";
  resetTaskComposer();
  elements.searchInput.value = "";
  state.searchTerm = "";
  state.statusFilter = "all";
  updateFilterButtons();
  state.latestTasks = [];
  clearEditingState();
  pendingTaskIds.clear();
  state.currentUser = null;
  setTaskSubmitting(false);
  setLogoutLoading(false);
  setAuthLoading(false);
}

function setSignedInView(user) {
  elements.authView.classList.add("hidden");
  elements.appView.classList.remove("hidden");
  elements.userEmail.textContent = user.email || "";
  state.currentUser = user;
  setAuthLoading(false);
}

function getTaskDraft(task) {
  return (
    editDrafts.get(task.id) || {
      text: task.text,
      priority: task.priority,
      category: task.category,
      dueDate: task.dueDate,
    }
  );
}

function focusTaskEditor(taskId) {
  requestAnimationFrame(() => {
    const editInput = elements.taskList.querySelector(
      `[data-task-id="${taskId}"] .task-edit-input`
    );

    if (editInput) {
      editInput.focus();
      editInput.select();
    }
  });
}

function startEditingTask(task) {
  if (pendingTaskIds.has(task.id)) {
    return;
  }

  state.editingTaskId = task.id;
  editDrafts.set(task.id, {
    text: task.text,
    priority: task.priority,
    category: task.category,
    dueDate: task.dueDate,
  });
  clearMessage();
  renderVisibleTasks();
  focusTaskEditor(task.id);
}

function cancelEditingTask(taskId) {
  if (state.editingTaskId === taskId) {
    state.editingTaskId = null;
  }

  editDrafts.delete(taskId);
  clearMessage();
  renderVisibleTasks();
}

function updateEditDraft(taskId, field, value) {
  const task = state.latestTasks.find((item) => item.id === taskId);
  if (!task) {
    return;
  }

  editDrafts.set(taskId, {
    ...getTaskDraft(task),
    [field]: value,
  });
}

function updateDashboard(tasks) {
  const completed = tasks.filter((task) => task.completed).length;
  const pending = tasks.length - completed;

  elements.totalCount.textContent = String(tasks.length);
  elements.completedCount.textContent = String(completed);
  elements.pendingCount.textContent = String(pending);
}

function updateResultsSummary(visibleCount, totalCount) {
  if (!totalCount) {
    elements.resultsSummary.textContent = "Showing 0 tasks";
    return;
  }

  if (visibleCount === totalCount && !state.searchTerm && state.statusFilter === "all") {
    elements.resultsSummary.textContent = `Showing all ${totalCount} tasks`;
    return;
  }

  elements.resultsSummary.textContent = `Showing ${visibleCount} of ${totalCount} tasks`;
}

function updateFilterButtons() {
  elements.filterButtons.forEach((button) => {
    const isActive = button.dataset.filter === state.statusFilter;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function applyTaskFilters(tasks) {
  const search = state.searchTerm.toLowerCase();

  return tasks.filter((task) => {
    const matchesSearch = task.text.toLowerCase().includes(search);
    const matchesStatus =
      state.statusFilter === "all" ||
      (state.statusFilter === "completed" && task.completed) ||
      (state.statusFilter === "pending" && !task.completed);

    return matchesSearch && matchesStatus;
  });
}

function createChip(text, className) {
  const chip = document.createElement("span");
  chip.className = className;
  chip.textContent = text;
  return chip;
}
function renderTasks(tasks) {
  elements.taskList.innerHTML = "";
  elements.taskList.classList.remove("hidden");
  elements.emptyState.style.display = tasks.length ? "none" : "block";

  if (
    state.editingTaskId &&
    !state.latestTasks.some((task) => task.id === state.editingTaskId)
  ) {
    clearEditingState();
  }

  tasks.forEach((task) => {
    const isEditing = state.editingTaskId === task.id;
    const overdue = isOverdue(task);
    const item = document.createElement("li");
    item.className = [
      "task-item",
      task.completed ? "completed" : "",
      overdue ? "overdue" : "",
      isEditing ? "editing" : "",
    ]
      .filter(Boolean)
      .join(" ");
    item.dataset.taskId = task.id;

    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.className = "task-toggle";
    toggle.checked = task.completed;
    toggle.setAttribute("aria-label", `Mark ${task.text} as completed`);
    toggle.addEventListener("change", () => handleToggleTask(task.id, toggle.checked));

    const content = document.createElement("div");
    content.className = "task-content";

    const createdAt = document.createElement("p");
    createdAt.className = "task-created-at";
    createdAt.textContent = formatCreatedAt(task.createdAt);

    const chipRow = document.createElement("div");
    chipRow.className = "task-details";
    chipRow.append(
      createChip(task.priority, `task-chip priority-chip ${getPriorityClass(task.priority)}`),
      createChip(task.category, "task-chip category-chip")
    );

    if (task.dueDate) {
      chipRow.append(
        createChip(
          formatDueDate(task.dueDate),
          `task-chip due-chip ${overdue ? "overdue-chip" : ""}`
        )
      );
    }

    chipRow.append(
      createChip(
        task.completed ? "Completed" : "Pending",
        `task-chip status-chip ${task.completed ? "done" : "open"}`
      )
    );

    const actions = document.createElement("div");
    actions.className = "task-actions";

    if (isEditing) {
      const draft = getTaskDraft(task);

      const editInput = document.createElement("input");
      editInput.type = "text";
      editInput.className = "task-edit-input";
      editInput.maxLength = 120;
      editInput.value = draft.text;
      editInput.setAttribute("aria-label", "Edit task text");
      editInput.addEventListener("input", (event) =>
        updateEditDraft(task.id, "text", event.target.value)
      );
      editInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          handleSaveTask(task.id);
        }

        if (event.key === "Escape") {
          event.preventDefault();
          cancelEditingTask(task.id);
        }
      });

      const editGrid = document.createElement("div");
      editGrid.className = "task-edit-grid";

      const prioritySelect = document.createElement("select");
      prioritySelect.className = "task-edit-select";
      PRIORITIES.forEach((priority) => {
        const option = document.createElement("option");
        option.value = priority;
        option.textContent = priority;
        option.selected = draft.priority === priority;
        prioritySelect.append(option);
      });
      prioritySelect.addEventListener("change", (event) =>
        updateEditDraft(task.id, "priority", event.target.value)
      );

      const categorySelect = document.createElement("select");
      categorySelect.className = "task-edit-select";
      CATEGORIES.forEach((category) => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        option.selected = draft.category === category;
        categorySelect.append(option);
      });
      categorySelect.addEventListener("change", (event) =>
        updateEditDraft(task.id, "category", event.target.value)
      );

      const dueDateInput = document.createElement("input");
      dueDateInput.type = "date";
      dueDateInput.className = "task-edit-input task-edit-date";
      dueDateInput.value = todayIsoDate();
      dueDateInput.min = todayIsoDate();
      dueDateInput.max = todayIsoDate();
      dueDateInput.addEventListener("change", (event) =>
        updateEditDraft(task.id, "dueDate", event.target.value)
      );

      editGrid.append(prioritySelect, categorySelect, dueDateInput);

      const saveButton = document.createElement("button");
      saveButton.type = "button";
      saveButton.className = "task-action-button confirm";
      saveButton.textContent = "Save";
      saveButton.addEventListener("click", () => handleSaveTask(task.id));

      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.className = "task-action-button subtle";
      cancelButton.textContent = "Cancel";
      cancelButton.addEventListener("click", () => cancelEditingTask(task.id));

      content.append(editInput, editGrid, chipRow, createdAt);
      actions.append(saveButton, cancelButton);
    } else {
      const text = document.createElement("p");
      text.className = "task-text";
      text.textContent = task.text;

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "task-action-button subtle";
      editButton.textContent = "Edit";
      editButton.addEventListener("click", () => startEditingTask(task));

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "icon-button";
      deleteButton.textContent = "Remove";
      deleteButton.addEventListener("click", () => handleDeleteTask(task.id));

      content.append(text, chipRow, createdAt);
      actions.append(editButton, deleteButton);
    }

    item.append(toggle, content, actions);
    elements.taskList.append(item);
    syncTaskItemState(task.id);
  });
}

function renderVisibleTasks() {
  updateDashboard(state.latestTasks);
  updateFilterButtons();
  const visibleTasks = applyTaskFilters(state.latestTasks);
  updateResultsSummary(visibleTasks.length, state.latestTasks.length);
  renderTasks(visibleTasks);
}

function subscribeToTasks(uid) {
  if (state.unsubscribeTasks) {
    state.unsubscribeTasks();
  }

  setTaskListLoading(true);

  // Tasks live under users/{uid}/tasks so each user only sees their own data.
  const tasksRef = collection(db, "users", uid, "tasks");
  const tasksQuery = query(tasksRef, orderBy("createdAt", "desc"));

  state.unsubscribeTasks = onSnapshot(
    tasksQuery,
    (snapshot) => {
      state.latestTasks = snapshot.docs.map((taskDoc) =>
        hydrateTask(taskDoc.id, taskDoc.data())
      );
      setTaskListLoading(false);
      renderVisibleTasks();
    },
    (error) => {
      setTaskListLoading(false);
      showMessage(
        `Could not load tasks: ${error.message}. Check your Firestore setup and rules.`,
        "error"
      );
    }
  );
}

async function handleAuthSubmit(event) {
  event.preventDefault();

  if (!isFirebaseConfigured()) {
    showMessage("Add your Firebase project config in app.js before signing in.", "error");
    return;
  }

  const email = elements.email.value.trim();
  const password = elements.password.value;
  const emailError = validateEmail(email);
  if (emailError) {
    showMessage(emailError, "error");
    return;
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    showMessage(passwordError, "error");
    return;
  }

  try {
    setAuthLoading(true);
    if (state.authMode === "login") {
      await signInWithEmailAndPassword(auth, email, password);
      showMessage("Logged in successfully.", "success");
    } else {
      await createUserWithEmailAndPassword(auth, email, password);
      showMessage("Account created successfully.", "success");
    }
    elements.authForm.reset();
  } catch (error) {
    setAuthLoading(false);
    showMessage(error.message, "error");
  }
}

async function handleAddTask(event) {
  event.preventDefault();

  if (!state.currentUser) {
    showMessage("You need to be logged in to add tasks.", "error");
    return;
  }

  const payload = {
    text: elements.taskInput.value,
    priority: elements.taskPriority.value,
    category: elements.taskCategory.value,
    dueDate: todayIsoDate(),
  };
  const validationMessage = validateTaskPayload(payload);
  if (validationMessage) {
    showMessage(validationMessage, "error");
    return;
  }

  try {
    setTaskSubmitting(true);
    const tasksRef = collection(db, "users", state.currentUser.uid, "tasks");
    await addDoc(tasksRef, {
      text: normalizeTaskText(payload.text),
      completed: false,
      priority: payload.priority,
      category: payload.category,
      dueDate: payload.dueDate || "",
      createdAt: serverTimestamp(),
    });
    resetTaskComposer();
    clearMessage();
  } catch (error) {
    showMessage(`Could not add task: ${error.message}`, "error");
  } finally {
    setTaskSubmitting(false);
  }
}

async function handleSaveTask(taskId) {
  if (!state.currentUser) {
    return;
  }

  const existingTask = state.latestTasks.find((task) => task.id === taskId);
  if (!existingTask) {
    cancelEditingTask(taskId);
    return;
  }

  const draft = getTaskDraft(existingTask);
  const validationMessage = validateTaskPayload(draft);
  if (validationMessage) {
    showMessage(validationMessage, "error");
    focusTaskEditor(taskId);
    return;
  }

  const nextTask = {
    text: normalizeTaskText(draft.text),
    priority: draft.priority,
    category: draft.category,
    dueDate: todayIsoDate(),
  };

  if (
    nextTask.text === existingTask.text &&
    nextTask.priority === existingTask.priority &&
    nextTask.category === existingTask.category &&
    nextTask.dueDate === existingTask.dueDate
  ) {
    cancelEditingTask(taskId);
    return;
  }

  try {
    setTaskPending(taskId, true);
    const taskRef = doc(db, "users", state.currentUser.uid, "tasks", taskId);
    await updateDoc(taskRef, nextTask);
    state.editingTaskId = null;
    editDrafts.delete(taskId);
    clearMessage();
  } catch (error) {
    showMessage(`Could not update task: ${error.message}`, "error");
  } finally {
    setTaskPending(taskId, false);
  }
}

async function handleToggleTask(taskId, completed) {
  if (!state.currentUser) {
    return;
  }

  try {
    setTaskPending(taskId, true);
    const taskRef = doc(db, "users", state.currentUser.uid, "tasks", taskId);
    await updateDoc(taskRef, { completed });
  } catch (error) {
    showMessage(`Could not update task: ${error.message}`, "error");
  } finally {
    setTaskPending(taskId, false);
  }
}

async function handleDeleteTask(taskId) {
  if (!state.currentUser) {
    return;
  }

  try {
    setTaskPending(taskId, true);
    const taskRef = doc(db, "users", state.currentUser.uid, "tasks", taskId);
    await deleteDoc(taskRef);
    if (state.editingTaskId === taskId) {
      clearEditingState();
    }
    clearMessage();
  } catch (error) {
    showMessage(`Could not delete task: ${error.message}`, "error");
  } finally {
    setTaskPending(taskId, false);
  }
}

async function handleLogout() {
  try {
    setLogoutLoading(true);
    await signOut(auth);
    showMessage("Logged out successfully.", "success");
  } catch (error) {
    setLogoutLoading(false);
    showMessage(`Could not log out: ${error.message}`, "error");
  }
}

function handleSearchInput(event) {
  state.searchTerm = event.target.value.trim();
  if (state.editingTaskId) {
    clearEditingState();
  }
  renderVisibleTasks();
}

function handleFilterChange(filter) {
  state.statusFilter = filter;
  if (state.editingTaskId) {
    clearEditingState();
  }
  renderVisibleTasks();
}

elements.loginTab.addEventListener("click", () => setAuthMode("login"));
elements.signupTab.addEventListener("click", () => setAuthMode("signup"));
elements.authForm.addEventListener("submit", handleAuthSubmit);
elements.taskForm.addEventListener("submit", handleAddTask);
elements.searchInput.addEventListener("input", handleSearchInput);
elements.filterButtons.forEach((button) => {
  button.addEventListener("click", () => handleFilterChange(button.dataset.filter));
});
elements.themeToggle.addEventListener("click", toggleTheme);
elements.logoutBtn.addEventListener("click", handleLogout);

onAuthStateChanged(auth, (user) => {
  if (!state.authResolved) {
    state.authResolved = true;
    setBootLoading(false);
  }

  if (user) {
    setSignedInView(user);
    clearMessage();
    subscribeToTasks(user.uid);
  } else {
    if (state.unsubscribeTasks) {
      state.unsubscribeTasks();
      state.unsubscribeTasks = null;
    }
    setSignedOutView();
  }
});

initializeTheme();
setAuthMode("login");
resetTaskComposer();
setBootLoading(true);

if (!isFirebaseConfigured()) {
  setBootLoading(false);
  showMessage("Paste your Firebase config into app.js to connect the app.", "info");
}
