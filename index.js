const CACHE_KEY = 'henry-actions';

const html = metrics => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Baby Metrics</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss/dist/tailwind.min.css" rel="stylesheet"></link>
  </head>

  <body class="bg-gray-100">
    <div class="w-full h-full flex content-center justify-center mt-8">
      <div class="bg-white shadow-md rounded px-8 pt-6 py-8 mb-4">
        <h1 class="block text-grey-800 text-md font-bold mb-2">What's Henry Up To?</h1>
        <h2 class="block text-grey-200 text-md mb-2 border-b py-2" id='mylabel'></h2>

        <div class="mt-4 content-center justify-center">
          <button class="bg-blue-500 hover:bg-blue-900 text-white font-bold ml-2 py-2 px-4 rounded focus:outline-none focus:shadow-outline" id="start_sleep" type="button" onClick="addAction(this)">Start Sleep</button>
          <button class="bg-blue-700 hover:bg-blue-900 text-white font-bold ml-2 py-2 px-4 rounded focus:outline-none focus:shadow-outline" id="end_sleep" type="button" onClick="addAction(this)">End Sleep</button>
        </div>
        <div class="mt-4 content-center justify-center">
          <button class="bg-green-500 hover:bg-green-900 text-white font-bold ml-2 py-2 px-4 rounded focus:outline-none focus:shadow-outline" id="start_feed" type="button" onClick="addAction(this)">Start Feed</button>
          <button class="bg-green-700 hover:bg-green-900 text-white font-bold ml-2 py-2 px-4 rounded focus:outline-none focus:shadow-outline" id="end_feed" type="button" onClick="addAction(this)">End Feed</button>
        </div>
        <div class="mt-4 content-center justify-center">
          <button class="bg-red-500 hover:bg-red-800 text-white font-bold ml-2 py-2 px-4 rounded focus:outline-none focus:shadow-outline" id="poo" type="button" onClick="addAction(this)">Poo Nappy</button>
          <button class="bg-yellow-500 hover:bg-yellow-800 text-white font-bold ml-2 py-2 px-4 rounded focus:outline-none focus:shadow-outline" id="wee" type="button" onClick="addAction(this)">Wee Nappy</button>
        </div>
        <div class="mt-4" id="metrics"></div>
      </div>
    </div>
  </body>

  <script>
    window.metrics = ${metrics}

    async function validateAction(current_action, last_action, last_timestamp) {
      if (last_action == 'start_sleep' && current_action != 'end_sleep') {
        var hours = window.prompt("Looks like we never got Henry's last wakeup time. How many hours was his last sleep?")
        last_timestamp.setTime(last_timestamp.getTime() + hours*3600000);
        await fetch("/", { method: 'PUT', body: JSON.stringify({ id: window.metrics.length + 1, action: "end_sleep", timestamp: last_timestamp }) });
      }
      if (last_action == 'start_feed' && current_action != 'end_feed') {
        var minutes = window.prompt("Looks like we never got Henry's last end of feeding. How many minutes did he last eat?")
        last_timestamp.setTime(last_timestamp.getTime() + minutes*60000);
        await fetch("/", { method: 'PUT', body: JSON.stringify({ id: window.metrics.length + 1, action: "end_feed", timestamp: last_timestamp }) });
      }

      var current_timestamp = new Date()
      if (current_action == 'end_sleep' && last_action != 'start_sleep') {
        var hours = window.prompt("Looks like we never got the time Henry went to sleep. How many hours ago did he go down?")
        current_timestamp.setTime(current_timestamp.getTime() - hours*3600000);
        await fetch("/", { method: 'PUT', body: JSON.stringify({ id: window.metrics.length + 1, action: "start_sleep", timestamp: current_timestamp }) });
      }
      if (current_action == 'end_feed' && last_action != 'start_feed') {
        var hours = window.prompt("Looks like we never got the time Henry started eating. How many minutes ago did he start eating?")
        current_timestamp.setTime(current_timestamp.getTime() - hours*60000);
        await fetch("/", { method: 'PUT', body: JSON.stringify({ id: window.metrics.length + 1, action: "start_feed", timestamp: current_timestamp }) });
      }
    }

    async function addAction(el) {
      var current_time = new Date();
      var current_action = el.id;
      if (window.metrics.length > 0) {
        var last_action = window.metrics.at(-1).action;
        var last_timestamp = new Date(window.metrics.at(-1).timestamp);
        await validateAction(current_action, last_action, last_timestamp)
      }
      await fetch("/", { method: 'PUT', body: JSON.stringify({ id: window.metrics.length + 1, action: el.id, timestamp: current_time }) });
      location.reload();
    }

    var listActions = function() {
      var todoContainer = document.querySelector("#metrics")
      todoContainer.innerHTML = null

      window.metrics.slice().reverse().forEach(element => {
        var el = document.createElement("div")
        el.className = "border-t py-4"
        el.dataset.element = element.id

        var name = document.createElement("span")
        var date = new Date(element.timestamp);
        name.textContent = element.action + ": " + date.toLocaleDateString() + " " + date.toLocaleTimeString([],{ hour: '2-digit', minute: '2-digit' })

        el.appendChild(name)
        todoContainer.appendChild(el)
      })
    }

    function currentAction() {
      if (window.metrics.length > 0) {
        const action = window.metrics.at(-1).action
      
        switch (action) {
          case 'start_sleep':
            return "Sleeping - or trying to! 😴";
            break;
          case 'start_feed':
            return "Getting that milk! 🍼";
            break;
          default:
            return "Probably just chilling 😎"
        }
      }
    }

    listActions();

    document.getElementById('mylabel').textContent = currentAction();
  </script>
</html>
`

const defaultData = { actions: [] }

const setCache = (key, data) => BABY_METRICS.put(key, data)
const getCache = key => BABY_METRICS.get(key)

async function getActions() {
  let data
  const cache = await getCache(CACHE_KEY)
  if (!cache) {
    await setCache(CACHE_KEY, JSON.stringify(defaultData))
    data = defaultData
  } else {
    data = JSON.parse(cache)
    console.log(data)
  }
  const body = html(JSON.stringify(data.actions || []).replace(/</g, "\\u003c"))
  return new Response(body, {
    headers: { 'Content-Type': 'text/html' },
  })
}

async function updateActions(request) {
  try {
    // Get existing data
    const current_data = await getCache(CACHE_KEY)
    const actions = JSON.parse(current_data).actions

    // Append new action and set
    const event = await request.text()
    actions.push(JSON.parse(event))
    const new_data = JSON.stringify({ "actions": actions})
    await setCache(CACHE_KEY, new_data)

    return new Response(actions, { status: 200 })
  } catch (err) {
    return new Response(err, { status: 500 })
  }
}

async function handleRequest(request) {
  if (request.method === 'PUT') {
    return updateActions(request)
  } else {
    return getActions()
  }
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})