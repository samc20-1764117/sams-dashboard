import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    const body = await req.json();
    const requestType = body.request?.type;

    // LaunchRequest — user said "Alexa, open my dashboard"
    if (requestType === "LaunchRequest") {
      return alexaResponse("Dashboard ready. You can say: create task, or add to shopping list.");
    }

    // IntentRequest — actual commands
    if (requestType === "IntentRequest") {
      const intentName = body.request.intent.name;

      if (intentName === "AddTaskIntent") {
        return await handleAddTask(body.request.intent.slots);
      }
      if (intentName === "AddShoppingIntent") {
        return await handleAddShopping(body.request.intent.slots);
      }

      // Built-in intents
      if (intentName === "AMAZON.HelpIntent") {
        return alexaResponse("You can say: create task buy groceries for today. Or: add milk to shopping list.");
      }
      if (intentName === "AMAZON.StopIntent" || intentName === "AMAZON.CancelIntent") {
        return alexaResponse("Goodbye!", true);
      }
    }

    // SessionEndedRequest
    if (requestType === "SessionEndedRequest") {
      return alexaResponse("", true);
    }

    return alexaResponse("I didn't understand that. Try: create task or add to shopping list.");
  } catch (e) {
    console.error("Error:", e);
    return alexaResponse("Sorry, something went wrong.");
  }
});

async function handleAddTask(slots: Record<string, any>) {
  const taskName = slots?.TaskName?.value;
  if (!taskName) {
    return alexaResponse("What task would you like to create?", false, true);
  }

  // Date slot is optional — defaults to today
  const dateSlot = slots?.TaskDate?.value;
  const dueDate = dateSlot || new Date().toISOString().split("T")[0];

  const { error } = await supabase.from("tasks").insert({
    name: taskName,
    category: "Personal",
    due_date: dueDate,
    done: false,
  });

  if (error) {
    console.error("Task insert error:", error);
    return alexaResponse("Sorry, I couldn't save that task.");
  }

  return alexaResponse(`Added task: ${taskName} for ${formatDate(dueDate)}.`, true);
}

async function handleAddShopping(slots: Record<string, any>) {
  const itemName = slots?.ItemName?.value;
  if (!itemName) {
    return alexaResponse("What item would you like to add?", false, true);
  }

  const store = slots?.StoreName?.value || null;

  const { error } = await supabase.from("shopping_list").insert({
    name: itemName,
    store: store,
    done: false,
  });

  if (error) {
    console.error("Shopping insert error:", error);
    return alexaResponse("Sorry, I couldn't add that item.");
  }

  const storeMsg = store ? ` for ${store}` : "";
  return alexaResponse(`Added ${itemName} to your shopping list${storeMsg}.`, true);
}

function formatDate(d: string): string {
  const dt = new Date(d + "T12:00:00");
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const diff = Math.round((dt.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  return dt.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function alexaResponse(text: string, shouldEnd = false, elicit = false) {
  const response: any = {
    version: "1.0",
    response: {
      outputSpeech: { type: "PlainText", text },
      shouldEndSession: shouldEnd,
    },
  };
  if (elicit) {
    response.response.shouldEndSession = false;
  }
  return new Response(JSON.stringify(response), {
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}
