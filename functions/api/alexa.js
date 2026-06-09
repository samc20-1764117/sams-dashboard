const SUPABASE_URL = 'https://gtirvyrqfuuuxkkqaeap.supabase.co';

export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  const sbKey = context.env.SUPABASE_KEY;
  const userId = context.env.SUPABASE_USER_ID;
  if (!sbKey) return alexaResp('Server misconfigured. No SUPABASE_KEY.');
  if (!userId) return alexaResp('Server misconfigured. No SUPABASE_USER_ID.');

  try {
    const body = await context.request.json();

    // Validate Alexa Application ID
    const appId = body.session?.application?.applicationId;
    if (!appId || appId !== context.env.ALEXA_SKILL_ID) {
      return new Response('Unauthorized', { status: 401 });
    }

    const reqType = body.request?.type;

    if (reqType === 'LaunchRequest') {
      return alexaResp('Dashboard ready. You can add tasks, shopping items, or log pup training sessions.');
    }

    if (reqType === 'IntentRequest') {
      const intent = body.request.intent.name;
      const slots = body.request.intent.slots || {};

      if (intent === 'AddTaskIntent') return await handleAddTask(slots, sbKey, userId);
      if (intent === 'AddShoppingIntent') return await handleAddShopping(slots, sbKey, userId);
      if (intent === 'LogPupSessionIntent') return await handleLogPupSession(slots, sbKey, userId);

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
async function handleAddTask(slots, sbKey, userId) {
  const taskName = capitalize(sanitize(slots.TaskName?.value));
  if (!taskName) return alexaResp('What task would you like to create?', false);

  const today = new Date().toISOString().split('T')[0];

  await sbRest('POST', 'tasks', sbKey, {
    name: taskName,
    category: 'Home',
    due_date: today,
    done: false,
    important: false,
    ...(userId && { user_id: userId }),
  });

  return alexaResp(`Added task: ${taskName} for today.`, true);
}

async function handleAddShopping(slots, sbKey, userId) {
  let raw = sanitize(slots.ItemName?.value);
  if (!raw) return alexaResp('What item would you like to add?', false);

  // Parse "for HEB" / "for Target" etc. from the end
  let store = null;
  const forMatch = raw.match(/\s+for\s+(.+)$/i);
  if (forMatch) {
    store = capitalize(forMatch[1].trim());
    raw = raw.slice(0, forMatch.index).trim();
  }

  const itemName = capitalize(raw);

  await sbRest('POST', 'shopping_list', sbKey, {
    name: itemName,
    store: store,
    done: false,
    ...(userId && { user_id: userId }),
  });

  const storeMsg = store ? ` for ${store}` : '';
  return alexaResp(`Added ${itemName} to your shopping list${storeMsg}.`, true);
}

async function handleLogPupSession(slots, sbKey, userId) {
  const phrase = sanitize(slots.PupTraining?.value);
  if (!phrase) {
    return alexaResp('Which pup and what skill? Try: Mochi practiced sit.', false);
  }

  // Parse pup name from the phrase — check if it starts with a known pup name
  const skills = await sbRest('GET', 'pup_skills', sbKey, null, '?select=id,pup,skill');
  const pupNames = [...new Set(skills.map(s => s.pup.toLowerCase()))];
  const words = phrase.toLowerCase().split(/\s+/);

  let pupName = null;
  let skillPart = phrase.toLowerCase();
  for (const name of pupNames) {
    if (words[0] === name) {
      pupName = name;
      // Remove pup name and filler words like "practiced", "did", "worked on"
      skillPart = words.slice(1).join(' ')
        .replace(/^(practiced|did|worked on|trained|session)\s*/i, '').trim();
      break;
    }
  }

  if (!pupName || !skillPart) {
    return alexaResp('Say the pup name then the skill. Like: Mochi practiced sit.', false);
  }

  const match = skills.find(s =>
    s.pup.toLowerCase() === pupName &&
    s.skill.toLowerCase().includes(skillPart)
  );

  if (!match) {
    return alexaResp(`I couldn't find that skill for ${pupName}. Try again?`, false);
  }

  const today = new Date().toISOString().split('T')[0];
  await sbRest('POST', 'pup_skill_sessions', sbKey, {
    skill_id: match.id,
    day_date: today,
    done: true,
    ...(userId && { user_id: userId }),
  });

  return alexaResp(`Logged ${match.skill} session for ${match.pup}.`, true);
}

// ── Helpers ──
function sanitize(val) {
  if (!val || typeof val !== 'string') return null;
  return val.trim().slice(0, 200);
}

function capitalize(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
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
