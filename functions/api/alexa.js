const SUPABASE_URL = 'https://gtirvyrqfuuuxkkqaeap.supabase.co';

export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  // Validate shared secret
  const token = context.request.headers.get('X-Alexa-Token');
  if (!token || token !== context.env.ALEXA_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  const sbKey = context.env.SUPABASE_KEY;
  if (!sbKey) return alexaResp('Server misconfigured.');

  try {
    const body = await context.request.json();
    const reqType = body.request?.type;

    if (reqType === 'LaunchRequest') {
      return alexaResp('Dashboard ready. You can add tasks, shopping items, or log pup training sessions.');
    }

    if (reqType === 'IntentRequest') {
      const intent = body.request.intent.name;
      const slots = body.request.intent.slots || {};

      if (intent === 'AddTaskIntent') return await handleAddTask(slots, sbKey);
      if (intent === 'AddShoppingIntent') return await handleAddShopping(slots, sbKey);
      if (intent === 'LogPupSessionIntent') return await handleLogPupSession(slots, sbKey);

      if (intent === 'AMAZON.HelpIntent') {
        return alexaResp('You can say: create task call the vet for tomorrow. Or: add milk to shopping list. Or: Mochi practiced sit.');
      }
      if (intent === 'AMAZON.StopIntent' || intent === 'AMAZON.CancelIntent') {
        return alexaResp('Goodbye!', true);
      }
    }

    if (reqType === 'SessionEndedRequest') {
      return alexaResp('', true);
    }

    return alexaResp("I didn't understand that. Try: create task, add to shopping list, or log a pup session.");
  } catch (e) {
    console.error('Alexa handler error:', e);
    return alexaResp('Sorry, something went wrong.');
  }
}

// ── Supabase REST helper ──
async function sbRest(method, table, sbKey, body, query) {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query || ''}`;
  const headers = {
    'apikey': sbKey,
    'Authorization': `Bearer ${sbKey}`,
    'Content-Type': 'application/json',
  };
  if (method === 'POST') headers['Prefer'] = 'return=representation';
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`Supabase ${method} ${table}: ${res.status}`);
  return res.json();
}

// ── Intent handlers ──
async function handleAddTask(slots, sbKey) {
  const taskName = sanitize(slots.TaskName?.value);
  if (!taskName) return alexaResp('What task would you like to create?', false);

  const dateSlot = slots.TaskDate?.value;
  const dueDate = dateSlot || new Date().toISOString().split('T')[0];

  await sbRest('POST', 'tasks', sbKey, {
    name: taskName,
    category: 'Home',
    due_date: dueDate,
    done: false,
    important: false,
  });

  return alexaResp(`Added task: ${taskName} for ${formatDate(dueDate)}.`, true);
}

async function handleAddShopping(slots, sbKey) {
  const itemName = sanitize(slots.ItemName?.value);
  if (!itemName) return alexaResp('What item would you like to add?', false);

  const store = sanitize(slots.StoreName?.value) || null;

  await sbRest('POST', 'shopping_list', sbKey, {
    name: itemName,
    store: store,
    done: false,
  });

  const storeMsg = store ? ` for ${store}` : '';
  return alexaResp(`Added ${itemName} to your shopping list${storeMsg}.`, true);
}

async function handleLogPupSession(slots, sbKey) {
  const pupName = sanitize(slots.PupName?.value);
  const skillName = sanitize(slots.SkillName?.value);
  if (!pupName || !skillName) {
    return alexaResp('Which pup and what skill? Try: Mochi practiced sit.', false);
  }

  // Query pup_skills for a case-insensitive partial match
  const skills = await sbRest('GET', 'pup_skills', sbKey, null, '?select=id,pup,skill');
  const pupLower = pupName.toLowerCase();
  const skillLower = skillName.toLowerCase();

  const match = skills.find(s =>
    s.pup.toLowerCase() === pupLower &&
    s.skill.toLowerCase().includes(skillLower)
  );

  if (!match) {
    return alexaResp(`I couldn't find that skill for ${pupName}. Try again?`, false);
  }

  const today = new Date().toISOString().split('T')[0];
  await sbRest('POST', 'pup_skill_sessions', sbKey, {
    skill_id: match.id,
    day_date: today,
    done: true,
  });

  return alexaResp(`Logged ${match.skill} session for ${match.pup}.`, true);
}

// ── Helpers ──
function sanitize(val) {
  if (!val || typeof val !== 'string') return null;
  return val.trim().slice(0, 200);
}

function formatDate(d) {
  const dt = new Date(d + 'T12:00:00');
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const diff = Math.round((dt.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  return dt.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function alexaResp(text, shouldEnd = false) {
  return new Response(JSON.stringify({
    version: '1.0',
    response: {
      outputSpeech: { type: 'PlainText', text },
      shouldEndSession: shouldEnd,
    },
  }), { headers: { 'Content-Type': 'application/json' } });
}
