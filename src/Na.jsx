import React, { useState, useEffect, useRef } from 'react';
import { Bell, Plus, Trash2, Edit2, Check, X, GripVertical, Clock } from 'lucide-react';

/**
 * NoteAlarm - A task reminder application with CRUD operations and alarms
 * Features:
 * - Create, Read, Update, Delete tasks
 * - Drag and drop reordering
 * - Alarm notifications at specified intervals
 * - Local storage persistence
 */
export default function NoteAlarm() {
  // State for managing tasks
  const [tasks, setTasks] = useState([]);
  
  // State for new task input form
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    interval: 5 // Default interval in minutes
  });
  
  // State for editing existing task
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    interval: 5
  });
  
  // State for drag and drop
  const [draggedTask, setDraggedTask] = useState(null);
  
  // Ref to store interval timers
  const timersRef = useRef({});

  /**
   * Load tasks from localStorage on component mount
   */
  useEffect(() => {
    const savedTasks = localStorage.getItem('noteAlarmTasks');
    if (savedTasks) {
      try {
        const parsedTasks = JSON.parse(savedTasks);
        setTasks(parsedTasks);
      } catch (error) {
        console.error('Error loading tasks from localStorage:', error);
      }
    }
  }, []);

  /**
   * Save tasks to localStorage whenever tasks change
   */
  useEffect(() => {
    if (tasks.length > 0) {
      localStorage.setItem('noteAlarmTasks', JSON.stringify(tasks));
    } else {
      localStorage.removeItem('noteAlarmTasks');
    }
  }, [tasks]);

  /**
   * Set up alarm timers for all active tasks
   */
  useEffect(() => {
    // Clear all existing timers
    Object.values(timersRef.current).forEach(timer => clearInterval(timer));
    timersRef.current = {};

    // Set up new timers for each task
    tasks.forEach(task => {
      if (task.interval > 0) {
        const intervalMs = task.interval * 60 * 1000; // Convert minutes to milliseconds
        
        timersRef.current[task.id] = setInterval(() => {
          triggerAlarm(task);
        }, intervalMs);
      }
    });

    // Cleanup function to clear timers when component unmounts
    return () => {
      Object.values(timersRef.current).forEach(timer => clearInterval(timer));
    };
  }, [tasks]);

  /**
   * Trigger alarm notification for a task
   * @param {Object} task - The task object to notify about
   */
  const triggerAlarm = (task) => {
    // Create and play alarm sound using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Function to create a beep sound
    const playBeep = (frequency, duration, delay = 0) => {
      setTimeout(() => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
      }, delay);
    };
    
    // Play alarm pattern: 3 beeps with increasing frequency
    playBeep(800, 0.2, 0);      // First beep
    playBeep(1000, 0.2, 500);   // Second beep
    playBeep(1200, 0.4, 1000);   // Third beep (longer)
    
    // Browser notification
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('NoteAlarm Reminder 🔔', {
            body: `Task: ${task.title}\n${task.description}`,
            icon: '🔔',
            requireInteraction: true
          });
        }
      });
    }
    
    // Visual alert
    setTimeout(() => {
      alert(`🔔 TASK REMINDER 🔔\n\nTask: ${task.title}\n${task.description}\n\nInterval: Every ${task.interval} minutes`);
    }, 1000);
  };

  /**
   * Create a new task
   */
  const handleCreateTask = (e) => {
    e.preventDefault();
    
    if (!newTask.title.trim()) {
      alert('Please enter a task title');
      return;
    }

    const task = {
      id: Date.now().toString(),
      title: newTask.title.trim(),
      description: newTask.description.trim(),
      interval: parseInt(newTask.interval) || 5,
      createdAt: new Date().toISOString()
    };

    setTasks([...tasks, task]);
    
    // Reset form
    setNewTask({
      title: '',
      description: '',
      interval: 5
    });
  };

  /**
   * Delete a task by ID
   * @param {string} id - The task ID to delete
   */
  const handleDeleteTask = (id) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      setTasks(tasks.filter(task => task.id !== id));
      
      // Clear the timer for this task
      if (timersRef.current[id]) {
        clearInterval(timersRef.current[id]);
        delete timersRef.current[id];
      }
    }
  };

  /**
   * Start editing a task
   * @param {Object} task - The task to edit
   */
  const handleStartEdit = (task) => {
    setEditingId(task.id);
    setEditForm({
      title: task.title,
      description: task.description,
      interval: task.interval
    });
  };

  /**
   * Save edited task
   */
  const handleSaveEdit = () => {
    if (!editForm.title.trim()) {
      alert('Please enter a task title');
      return;
    }

    setTasks(tasks.map(task => 
      task.id === editingId
        ? {
            ...task,
            title: editForm.title.trim(),
            description: editForm.description.trim(),
            interval: parseInt(editForm.interval) || 5
          }
        : task
    ));

    setEditingId(null);
  };

  /**
   * Cancel editing
   */
  const handleCancelEdit = () => {
    setEditingId(null);
  };

  /**
   * Handle drag start
   * @param {Object} task - The task being dragged
   */
  const handleDragStart = (task) => {
    setDraggedTask(task);
  };

  /**
   * Handle drag over (allow drop)
   * @param {Event} e - The drag event
   */
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  /**
   * Handle drop - reorder tasks
   * @param {Object} targetTask - The task being dropped onto
   */
  const handleDrop = (targetTask) => {
    if (!draggedTask || draggedTask.id === targetTask.id) return;

    const draggedIndex = tasks.findIndex(t => t.id === draggedTask.id);
    const targetIndex = tasks.findIndex(t => t.id === targetTask.id);

    const newTasks = [...tasks];
    newTasks.splice(draggedIndex, 1);
    newTasks.splice(targetIndex, 0, draggedTask);

    setTasks(newTasks);
    setDraggedTask(null);
  };

  /**
   * Request notification permission on first interaction
   */
  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4" onClick={requestNotificationPermission}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Bell className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-800">NoteAlarm</h1>
          </div>
          <p className="text-gray-600">Never forget your tasks again! Set reminders at your preferred intervals.</p>
        </div>

        {/* Create Task Form */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add New Task
          </h2>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task Title *
              </label>
              <input
                type="text"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Enter task title..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Add task description..."
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reminder Interval (minutes) *
              </label>
              <input
                type="number"
                value={newTask.interval}
                onChange={(e) => setNewTask({ ...newTask, interval: e.target.value })}
                min="1"
                placeholder="5"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Task
            </button>
          </form>
        </div>

        {/* Tasks List */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Your Tasks ({tasks.length})
          </h2>
          
          {tasks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Bell className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>No tasks yet. Create your first task above!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => handleDragStart(task)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(task)}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-move bg-gray-50"
                >
                  {editingId === task.id ? (
                    // Edit Mode
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                      />
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        rows="2"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                      />
                      <input
                        type="number"
                        value={editForm.interval}
                        onChange={(e) => setEditForm({ ...editForm, interval: e.target.value })}
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveEdit}
                          className="flex-1 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="flex-1 bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Display Mode
                    <div className="flex items-start gap-3">
                      <GripVertical className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                      <div className="flex-grow">
                        <h3 className="font-semibold text-gray-800 text-lg">{task.title}</h3>
                        {task.description && (
                          <p className="text-gray-600 mt-1">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-sm text-indigo-600">
                          <Clock className="w-4 h-4" />
                          <span>Reminds every {task.interval} minutes</span>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleStartEdit(task)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit task"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete task"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-gray-600 bg-white rounded-lg shadow p-4">
          <p>💡 Tip: Drag tasks to reorder them. Alarms will trigger at your specified intervals.</p>
          <p className="mt-1">Click anywhere to enable notifications for alarms.</p>
        </div>
      </div>
    </div>
  );
}