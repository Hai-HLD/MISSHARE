var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/utils/password.js
var password_exports = {};
__export(password_exports, {
  hashPassword: () => hashPassword,
  verifyPassword: () => verifyPassword
});
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}
async function verifyPassword(password, hash) {
  try {
    const hashedPassword = await hashPassword(password);
    const isValid = hashedPassword === hash;
    return isValid;
  } catch (error) {
    console.error("Password verification error:", error);
    return false;
  }
}
var init_password = __esm({
  "src/utils/password.js"() {
    __name(hashPassword, "hashPassword");
    __name(verifyPassword, "verifyPassword");
  }
});

// src/utils/jwt.js
function generateJWT(payload, env) {
  const header = {
    alg: "HS256",
    typ: "JWT"
  };
  const now = Math.floor(Date.now() / 1e3);
  const exp = now + parseInt(env.JWT_EXPIRY_HOURS) * 60 * 60;
  const jwtPayload = {
    ...payload,
    iss: env.JWT_ISSUER,
    aud: env.JWT_AUDIENCE,
    iat: now,
    exp
  };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(jwtPayload));
  const signature = createSignature(`${encodedHeader}.${encodedPayload}`, env.JWT_SECRET);
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}
__name(generateJWT, "generateJWT");
function verifyJWT(token, env) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }
    const [encodedHeader, encodedPayload, signature] = parts;
    const expectedSignature = createSignature(`${encodedHeader}.${encodedPayload}`, env.JWT_SECRET);
    if (signature !== expectedSignature) {
      return null;
    }
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1e3);
    if (payload.exp && payload.exp < now) {
      return null;
    }
    if (payload.iss !== env.JWT_ISSUER || payload.aud !== env.JWT_AUDIENCE) {
      return null;
    }
    return payload;
  } catch (error) {
    console.error("JWT verification error:", error);
    return null;
  }
}
__name(verifyJWT, "verifyJWT");
function base64UrlEncode(str) {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
__name(base64UrlEncode, "base64UrlEncode");
function base64UrlDecode(str) {
  str += "=".repeat((4 - str.length % 4) % 4);
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  return atob(str);
}
__name(base64UrlDecode, "base64UrlDecode");
function createSignature(data, secret) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);
  return base64UrlEncode(secret + data + secret);
}
__name(createSignature, "createSignature");

// src/handlers/auth.js
init_password();
async function AuthHandler(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  try {
    if (path === "/api/auth/register" && method === "POST") {
      return await register(request, env);
    } else if (path === "/api/auth/login" && method === "POST") {
      return await login(request, env);
    } else if (path === "/api/auth/me" && method === "GET") {
      return await getCurrentUser(request, env);
    } else if (path === "/api/auth/change-password" && method === "PUT") {
      return await changePassword(request, env);
    } else {
      return new Response("Not Found", { status: 404 });
    }
  } catch (error) {
    console.error("Auth handler error:", error);
    return new Response(
      JSON.stringify({ error: "Authentication error", message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(AuthHandler, "AuthHandler");
async function register(request, env) {
  const body = await request.json();
  const { firstName, lastName, email, cwid, password } = body;
  if (!firstName || !lastName || !email || !cwid || !password) {
    return new Response(
      JSON.stringify({ error: "All fields are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (cwid.length !== 8 || !/^\d{8}$/.test(cwid)) {
    return new Response(
      JSON.stringify({ error: "CWID must be exactly 8 digits" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (password.length < 8) {
    return new Response(
      JSON.stringify({ error: "Password must be at least 8 characters long" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  try {
    const existingUser = await env.DB.prepare(
      "SELECT * FROM Users WHERE Email = ? OR CWID = ?"
    ).bind(email, cwid).first();
    if (existingUser) {
      return new Response(
        JSON.stringify({ error: "User with this email or CWID already exists" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const passwordHash = await hashPassword(password);
    const result = await env.DB.prepare(
      "INSERT INTO Users (CWID, FirstName, LastName, Email, PasswordHash) VALUES (?, ?, ?, ?, ?)"
    ).bind(cwid, firstName, lastName, email, passwordHash).run();
    if (result.success) {
      const user = { cwid, firstName, lastName, email };
      const token = generateJWT(user, env);
      return new Response(
        JSON.stringify({
          token,
          user,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString()
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      );
    } else {
      throw new Error("Failed to create user");
    }
  } catch (error) {
    console.error("Registration error:", error);
    return new Response(
      JSON.stringify({ error: "Registration failed", message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(register, "register");
async function login(request, env) {
  const body = await request.json();
  const { email, password } = body;
  if (!email || !password) {
    return new Response(
      JSON.stringify({ error: "Email and password are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  try {
    const user = await env.DB.prepare(
      "SELECT * FROM Users WHERE Email = ?"
    ).bind(email).first();
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Invalid email or password" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const isValidPassword = await verifyPassword(password, user.PasswordHash);
    if (!isValidPassword) {
      return new Response(
        JSON.stringify({ error: "Invalid email or password" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const userData = {
      cwid: user.CWID,
      firstName: user.FirstName,
      lastName: user.LastName,
      email: user.Email
    };
    const token = generateJWT(userData, env);
    return new Response(
      JSON.stringify({
        token,
        user: userData,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString()
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Login error:", error);
    return new Response(
      JSON.stringify({ error: "Login failed", message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(login, "login");
async function getCurrentUser(request, env) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authorization token required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const token = authHeader.substring(7);
    const decoded = verifyJWT(token, env);
    if (!decoded) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const user = await env.DB.prepare(
      "SELECT * FROM Users WHERE CWID = ?"
    ).bind(decoded.cwid).first();
    if (!user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    const notesCount = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM Notes WHERE AuthorId = ?"
    ).bind(decoded.cwid).first();
    const userData = {
      cwid: user.CWID,
      firstName: user.FirstName,
      lastName: user.LastName,
      email: user.Email,
      notesCount: notesCount.count || 0
    };
    return new Response(
      JSON.stringify(userData),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Get current user error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to get user", message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(getCurrentUser, "getCurrentUser");
async function changePassword(request, env) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authorization token required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const token = authHeader.substring(7);
    const decoded = verifyJWT(token, env);
    if (!decoded) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const body = await request.json();
    const { currentPassword, newPassword } = body;
    if (!currentPassword || !newPassword) {
      return new Response(
        JSON.stringify({ error: "Current password and new password are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: "New password must be at least 6 characters long" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const user = await env.DB.prepare(
      "SELECT * FROM Users WHERE CWID = ?"
    ).bind(decoded.cwid).first();
    if (!user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.PasswordHash);
    if (!isCurrentPasswordValid) {
      return new Response(
        JSON.stringify({ error: "Current password is incorrect" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const hashedNewPassword = await hashPassword(newPassword);
    const result = await env.DB.prepare(
      "UPDATE Users SET PasswordHash = ? WHERE CWID = ?"
    ).bind(hashedNewPassword, decoded.cwid).run();
    if (result.success) {
      return new Response(
        JSON.stringify({ message: "Password changed successfully" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } else {
      throw new Error("Failed to update password");
    }
  } catch (error) {
    console.error("Change password error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to change password", message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(changePassword, "changePassword");

// src/handlers/notes.js
async function NotesHandler(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  try {
    if (path === "/api/notes" && method === "GET") {
      return await getNotes(request, env);
    } else if (path.startsWith("/api/notes/") && method === "GET") {
      const id = path.split("/")[3];
      return await getNote(id, env);
    } else if (path === "/api/notes" && method === "POST") {
      return await createNote(request, env);
    } else if (path.startsWith("/api/notes/") && method === "PUT") {
      const id = path.split("/")[3];
      return await updateNote(id, request, env);
    } else if (path.startsWith("/api/notes/") && method === "DELETE") {
      const id = path.split("/")[3];
      return await deleteNote(id, request, env);
    } else {
      return new Response("Not Found", { status: 404 });
    }
  } catch (error) {
    console.error("Notes handler error:", error);
    return new Response(
      JSON.stringify({ error: "Notes operation error", message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(NotesHandler, "NotesHandler");
async function getNotes(request, env) {
  console.log("getNotes called with URL:", request.url);
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  console.log("Search params:", Object.fromEntries(searchParams.entries()));
  let query = `
    SELECT n.Id as id, n.AuthorId as authorId, n.Title as title, n.Class as class, n.Topic as topic, n.Year as year, n.Content as content, n.CreatedAt as createdAt,
           u.FirstName as firstName, u.LastName as lastName, (u.FirstName || ' ' || u.LastName) as authorName
    FROM Notes n 
    INNER JOIN Users u ON n.AuthorId = u.CWID
  `;
  const conditions = [];
  const params = [];
  if (searchParams.get("title")) {
    conditions.push("LOWER(n.Title) LIKE LOWER(?)");
    params.push(`%${searchParams.get("title")}%`);
  }
  if (searchParams.get("topic")) {
    conditions.push("LOWER(n.Topic) = LOWER(?)");
    params.push(searchParams.get("topic"));
  }
  if (searchParams.get("class")) {
    conditions.push("LOWER(n.Class) = LOWER(?)");
    params.push(searchParams.get("class"));
  }
  if (searchParams.get("year")) {
    conditions.push("n.Year = ?");
    params.push(parseInt(searchParams.get("year")));
  }
  if (searchParams.get("author")) {
    conditions.push('LOWER(u.FirstName || " " || u.LastName) LIKE LOWER(?)');
    params.push(`%${searchParams.get("author")}%`);
  }
  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") || "desc";
  query += ` ORDER BY n.${sortBy} ${sortOrder.toUpperCase()}`;
  const page = parseInt(searchParams.get("page")) || 1;
  const pageSize = parseInt(searchParams.get("pageSize")) || 10;
  const offset = (page - 1) * pageSize;
  query += ` LIMIT ? OFFSET ?`;
  params.push(pageSize, offset);
  try {
    const notes = await env.DB.prepare(query).bind(...params).all();
    console.log("Notes query result:", notes);
    console.log("Notes results:", notes.results);
    let countQuery = "SELECT COUNT(*) as total FROM Notes n INNER JOIN Users u ON n.AuthorId = u.CWID";
    if (conditions.length > 0) {
      countQuery += " WHERE " + conditions.join(" AND ");
    }
    const countParams = params.slice(0, -2);
    const countResult = await env.DB.prepare(countQuery).bind(...countParams).first();
    console.log("getNotes - Raw notes result:", notes);
    console.log("getNotes - Notes results:", notes.results);
    console.log("getNotes - Count result:", countResult);
    const response = new Response(
      JSON.stringify(notes.results || []),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
    response.headers.set("X-Total-Count", countResult.total.toString());
    response.headers.set("X-Page", page.toString());
    response.headers.set("X-Page-Size", pageSize.toString());
    return response;
  } catch (error) {
    console.error("Get notes error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to get notes", message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(getNotes, "getNotes");
async function getNote(id, env) {
  try {
    console.log("Getting note with ID:", id);
    const note = await env.DB.prepare(`
      SELECT n.Id as id, n.AuthorId as authorId, n.Title as title, n.Class as class, n.Topic as topic, n.Year as year, n.Content as content, n.CreatedAt as createdAt,
             u.FirstName as firstName, u.LastName as lastName, (u.FirstName || ' ' || u.LastName) as authorName
      FROM Notes n 
      INNER JOIN Users u ON n.AuthorId = u.CWID
      WHERE n.Id = ?
    `).bind(id).first();
    console.log("Note query result:", note);
    if (!note) {
      return new Response(
        JSON.stringify({ error: "Note not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify(note),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Get note error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to get note", message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(getNote, "getNote");
async function createNote(request, env) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authorization token required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const token = authHeader.substring(7);
    const decoded = verifyJWT(token, env);
    if (!decoded) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const body = await request.json();
    const { title, class: noteClass, topic, year, content } = body;
    if (!title || !noteClass || !topic || !year || !content) {
      return new Response(
        JSON.stringify({ error: "All fields are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const result = await env.DB.prepare(`
      INSERT INTO Notes (AuthorId, Title, Class, Topic, Year, Content, CreatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(decoded.cwid, title, noteClass, topic, year, content, (/* @__PURE__ */ new Date()).toISOString()).run();
    if (result.success) {
      const createdNote = await env.DB.prepare(`
        SELECT n.Id as id, n.AuthorId as authorId, n.Title as title, n.Class as class, n.Topic as topic, n.Year as year, n.Content as content, n.CreatedAt as createdAt,
               u.FirstName as firstName, u.LastName as lastName, (u.FirstName || ' ' || u.LastName) as authorName
        FROM Notes n 
        INNER JOIN Users u ON n.AuthorId = u.CWID
        WHERE n.Id = ?
      `).bind(result.meta.last_row_id).first();
      return new Response(
        JSON.stringify(createdNote),
        { status: 201, headers: { "Content-Type": "application/json" } }
      );
    } else {
      throw new Error("Failed to create note");
    }
  } catch (error) {
    console.error("Create note error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create note", message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(createNote, "createNote");
async function updateNote(id, request, env) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authorization token required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const token = authHeader.substring(7);
    const decoded = verifyJWT(token, env);
    if (!decoded) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const existingNote = await env.DB.prepare(
      "SELECT AuthorId FROM Notes WHERE Id = ?"
    ).bind(id).first();
    if (!existingNote) {
      return new Response(
        JSON.stringify({ error: "Note not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    if (existingNote.AuthorId !== decoded.cwid) {
      return new Response(
        JSON.stringify({ error: "Not authorized to update this note" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
    const body = await request.json();
    const { title, class: noteClass, topic, year, content } = body;
    const updates = [];
    const params = [];
    if (title) {
      updates.push("Title = ?");
      params.push(title);
    }
    if (noteClass) {
      updates.push("Class = ?");
      params.push(noteClass);
    }
    if (topic) {
      updates.push("Topic = ?");
      params.push(topic);
    }
    if (year) {
      updates.push("Year = ?");
      params.push(year);
    }
    if (content) {
      updates.push("Content = ?");
      params.push(content);
    }
    if (updates.length === 0) {
      return new Response(
        JSON.stringify({ error: "No fields to update" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    params.push(id);
    const query = `UPDATE Notes SET ${updates.join(", ")} WHERE Id = ?`;
    const result = await env.DB.prepare(query).bind(...params).run();
    if (result.success) {
      const updatedNote = await env.DB.prepare(`
        SELECT n.Id as id, n.AuthorId as authorId, n.Title as title, n.Class as class, n.Topic as topic, n.Year as year, n.Content as content, n.CreatedAt as createdAt,
               u.FirstName as firstName, u.LastName as lastName, (u.FirstName || ' ' || u.LastName) as authorName
        FROM Notes n 
        INNER JOIN Users u ON n.AuthorId = u.CWID
        WHERE n.Id = ?
      `).bind(id).first();
      return new Response(
        JSON.stringify(updatedNote),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } else {
      throw new Error("Failed to update note");
    }
  } catch (error) {
    console.error("Update note error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to update note", message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(updateNote, "updateNote");
async function deleteNote(id, request, env) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authorization token required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const token = authHeader.substring(7);
    const decoded = verifyJWT(token, env);
    if (!decoded) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const existingNote = await env.DB.prepare(
      "SELECT AuthorId FROM Notes WHERE Id = ?"
    ).bind(id).first();
    if (!existingNote) {
      return new Response(
        JSON.stringify({ error: "Note not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    if (existingNote.AuthorId !== decoded.cwid) {
      return new Response(
        JSON.stringify({ error: "Not authorized to delete this note" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
    const result = await env.DB.prepare("DELETE FROM Notes WHERE Id = ?").bind(id).run();
    if (result.success) {
      return new Response(null, { status: 204 });
    } else {
      throw new Error("Failed to delete note");
    }
  } catch (error) {
    console.error("Delete note error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to delete note", message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(deleteNote, "deleteNote");

// src/handlers/users.js
async function UsersHandler(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  try {
    if (path.match(/^\/api\/users\/[^\/]+$/) && method === "GET") {
      const cwid = path.split("/")[3];
      return await getUser(cwid, env);
    } else if (path === "/api/users/profile" && method === "PUT") {
      return await updateProfile(request, env);
    } else if (path.match(/^\/api\/users\/[^\/]+\/notes$/) && method === "GET") {
      const cwid = path.split("/")[3];
      return await getUserNotes(cwid, request, env);
    } else {
      return new Response("Not Found", { status: 404 });
    }
  } catch (error) {
    console.error("Users handler error:", error);
    return new Response(
      JSON.stringify({ error: "Users operation error", message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(UsersHandler, "UsersHandler");
async function getUser(cwid, env) {
  try {
    const user = await env.DB.prepare(
      "SELECT * FROM Users WHERE CWID = ?"
    ).bind(cwid).first();
    if (!user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    const notesCount = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM Notes WHERE AuthorId = ?"
    ).bind(cwid).first();
    const userData = {
      cwid: user.CWID,
      firstName: user.FirstName,
      lastName: user.LastName,
      email: user.Email,
      notesCount: notesCount.count || 0
    };
    return new Response(
      JSON.stringify(userData),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Get user error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to get user", message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(getUser, "getUser");
async function updateProfile(request, env) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authorization token required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const token = authHeader.substring(7);
    const decoded = verifyJWT(token, env);
    if (!decoded) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const body = await request.json();
    const { firstName, lastName } = body;
    const updates = [];
    const params = [];
    if (firstName) {
      updates.push("FirstName = ?");
      params.push(firstName);
    }
    if (lastName) {
      updates.push("LastName = ?");
      params.push(lastName);
    }
    if (updates.length === 0) {
      return new Response(
        JSON.stringify({ error: "No fields to update" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    params.push(decoded.cwid);
    const query = `UPDATE Users SET ${updates.join(", ")} WHERE CWID = ?`;
    const result = await env.DB.prepare(query).bind(...params).run();
    if (result.success) {
      const updatedUser = await env.DB.prepare(
        "SELECT * FROM Users WHERE CWID = ?"
      ).bind(decoded.cwid).first();
      const notesCount = await env.DB.prepare(
        "SELECT COUNT(*) as count FROM Notes WHERE AuthorId = ?"
      ).bind(decoded.cwid).first();
      const userData = {
        cwid: updatedUser.CWID,
        firstName: updatedUser.FirstName,
        lastName: updatedUser.LastName,
        email: updatedUser.Email,
        notesCount: notesCount.count || 0
      };
      return new Response(
        JSON.stringify(userData),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } else {
      throw new Error("Failed to update profile");
    }
  } catch (error) {
    console.error("Update profile error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to update profile", message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(updateProfile, "updateProfile");
async function getUserNotes(cwid, request, env) {
  try {
    console.log("getUserNotes called for CWID:", cwid);
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    console.log("getUserNotes search params:", Object.fromEntries(searchParams.entries()));
    const page = parseInt(searchParams.get("page")) || 1;
    const pageSize = parseInt(searchParams.get("pageSize")) || 10;
    const offset = (page - 1) * pageSize;
    const user = await env.DB.prepare(
      "SELECT * FROM Users WHERE CWID = ?"
    ).bind(cwid).first();
    if (!user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    const notes = await env.DB.prepare(`
      SELECT n.Id as id, n.AuthorId as authorId, n.Title as title, n.Class as class, n.Topic as topic, n.Year as year, n.Content as content, n.CreatedAt as createdAt,
             u.FirstName as firstName, u.LastName as lastName, (u.FirstName || ' ' || u.LastName) as authorName
      FROM Notes n 
      INNER JOIN Users u ON n.AuthorId = u.CWID
      WHERE n.AuthorId = ?
      ORDER BY n.CreatedAt DESC
      LIMIT ? OFFSET ?
    `).bind(cwid, pageSize, offset).all();
    const countResult = await env.DB.prepare(
      "SELECT COUNT(*) as total FROM Notes WHERE AuthorId = ?"
    ).bind(cwid).first();
    console.log("getUserNotes - Raw notes result:", notes);
    console.log("getUserNotes - Notes results:", notes.results);
    console.log("getUserNotes - Count result:", countResult);
    const response = new Response(
      JSON.stringify(notes.results || []),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
    response.headers.set("X-Total-Count", countResult.total.toString());
    response.headers.set("X-Page", page.toString());
    response.headers.set("X-Page-Size", pageSize.toString());
    return response;
  } catch (error) {
    console.error("Get user notes error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to get user notes", message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(getUserNotes, "getUserNotes");

// src/handlers/test.js
async function TestHandler(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  try {
    if (path === "/api/test/d1-connection" && method === "GET") {
      return await testD1Connection(env);
    } else if (path === "/api/test/db-structure" && method === "GET") {
      return await testDbStructure(env);
    } else if (path === "/api/test/users" && method === "GET") {
      return await testUsers(env);
    } else if (path === "/api/test/password" && method === "POST") {
      return await testPassword(request, env);
    } else {
      return new Response("Not Found", { status: 404 });
    }
  } catch (error) {
    console.error("Test handler error:", error);
    return new Response(
      JSON.stringify({ error: "Test operation error", message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(TestHandler, "TestHandler");
async function testD1Connection(env) {
  try {
    const result = await env.DB.prepare("SELECT 1 as TestValue").first();
    if (result && result.TestValue === 1) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "D1 Connection successful!",
          testValue: result.TestValue,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          message: "D1 Connection failed: Unexpected result",
          result
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("D1 connection test error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "D1 Connection error",
        error: error.message
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(testD1Connection, "testD1Connection");
async function testDbStructure(env) {
  try {
    const tables = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    let usersTableInfo = null;
    if (tables.results && tables.results.some((t) => t.name === "Users")) {
      usersTableInfo = await env.DB.prepare("PRAGMA table_info(Users)").all();
    }
    return new Response(
      JSON.stringify({
        success: true,
        tables: tables.results || [],
        usersTableInfo: usersTableInfo?.results || null,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("DB structure test error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "DB structure test error",
        error: error.message
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(testDbStructure, "testDbStructure");
async function testUsers(env) {
  try {
    const users = await env.DB.prepare("SELECT CWID, FirstName, LastName, Email FROM Users").all();
    return new Response(
      JSON.stringify({
        success: true,
        userCount: users.results?.length || 0,
        users: users.results || [],
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Users test error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Users test error",
        error: error.message
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(testUsers, "testUsers");
async function testPassword(request, env) {
  try {
    const body = await request.json();
    const { email, password } = body;
    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const user = await env.DB.prepare("SELECT * FROM Users WHERE Email = ?").bind(email).first();
    if (!user) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "User not found",
          email
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    const { verifyPassword: verifyPassword2, hashPassword: hashPassword2 } = await Promise.resolve().then(() => (init_password(), password_exports));
    const isValid = await verifyPassword2(password, user.PasswordHash);
    const newHash = await hashPassword2(password);
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          cwid: user.CWID,
          email: user.Email,
          firstName: user.FirstName,
          lastName: user.LastName
        },
        passwordVerification: {
          isValid,
          storedHash: user.PasswordHash,
          hashFormat: user.PasswordHash.includes(":") ? "new" : "legacy"
        },
        newHash,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Password test error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Password test error",
        error: error.message
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
__name(testPassword, "testPassword");

// src/index.js
var index_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };
    if (method === "OPTIONS") {
      return new Response(null, { status: 200, headers: corsHeaders });
    }
    try {
      let response;
      if (path.startsWith("/api/auth/")) {
        response = await AuthHandler(request, env);
      } else if (path.startsWith("/api/notes")) {
        response = await NotesHandler(request, env);
      } else if (path.startsWith("/api/users/")) {
        response = await UsersHandler(request, env);
      } else if (path.startsWith("/api/test/")) {
        response = await TestHandler(request, env);
      } else {
        response = new Response("Not Found", { status: 404 });
      }
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    } catch (error) {
      console.error("Worker error:", error);
      const errorResponse = new Response(
        JSON.stringify({ error: "Internal Server Error", message: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
      Object.entries(corsHeaders).forEach(([key, value]) => {
        errorResponse.headers.set(key, value);
      });
      return errorResponse;
    }
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
