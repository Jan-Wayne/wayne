/* Nexa frontend. Configure Supabase in CONFIG below before using real accounts. */
(() => {
  "use strict";
  const CONFIG = {
    supabaseUrl: "https://ynivynnelldezzcbxwpe.supabase.co",
    supabaseAnonKey: "sb_publishable_Nj-WfEwpljsGGShhaA_VCg_hCUqkYS6"
  };
  const $ = (id) => document.getElementById(id);
  const supabaseReady = !CONFIG.supabaseUrl.startsWith("YOUR_") &&
    !CONFIG.supabaseAnonKey.startsWith("YOUR_") &&
    window.supabase?.createClient;
  const db = supabaseReady ? window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey) : null;
  let currentUser = null, currentProfile = null, authMode = "signin", toastTimer = null;
  let cachedProfiles = [], cachedPosts = [], cachedConnections = [];

  const demoJobs = [
    {title:"Junior Front-End Developer",company:"Northstar Digital",location:"Quezon City, Philippines",type:"Full-time",level:"Entry level",description:"Help build accessible, responsive web experiences with a collaborative product team."},
    {title:"UI/UX Design Intern",company:"Brightside Studio",location:"Remote · Philippines",type:"Internship",level:"Internship",description:"Work with designers and developers to research, prototype, and improve digital products."},
    {title:"Marketing Associate",company:"Goodwork Collective",location:"Makati, Philippines",type:"Full-time",level:"Entry level",description:"Support campaigns, content planning, and community growth across digital channels."},
    {title:"Customer Success Specialist",company:"Cloudlane",location:"Remote · Philippines",type:"Full-time",level:"Associate",description:"Help customers get the most from a growing software platform and share feedback with product teams."}
  ];
  const demoPeople = [
    {id:"sample-1",full_name:"Mika Reyes",headline:"Graphic Designer | Visual Storytelling",location:"Manila, Philippines",about:"Designing thoughtful visual experiences.",skills:["Graphic Design","Branding"]},
    {id:"sample-2",full_name:"Adrian Santos",headline:"Software Developer | JavaScript",location:"Quezon City, Philippines",about:"Building useful products with code.",skills:["JavaScript","React"]},
    {id:"sample-3",full_name:"Alyssa Cruz",headline:"HR Associate | People & Culture",location:"Makati, Philippines",about:"Helping people and teams thrive.",skills:["Recruitment","Communication"]},
    {id:"sample-4",full_name:"Noah Lim",headline:"Marketing Specialist | Content Strategy",location:"Remote, Philippines",about:"Turning ideas into stories people remember.",skills:["Marketing","Content"]},
    {id:"sample-5",full_name:"Jamie Flores",headline:"Computer Science Student",location:"Cebu, Philippines",about:"Learning, building, and connecting.",skills:["Python","Problem solving"]}
  ];
  const demoPosts = [
    {id:"sample-post-1",content:"A reminder for anyone starting their career: you don't need to know everything on day one. Stay curious, ask thoughtful questions, and keep building. Small steps add up. 🌱",created_at:new Date(Date.now()-1000*60*45).toISOString(),profiles:{id:"sample-2",full_name:"Adrian Santos",headline:"Software Developer | JavaScript",location:"Quezon City, Philippines"}},
    {id:"sample-post-2",content:"Just finished refreshing my portfolio! It feels good to look back at how much I've learned by simply showing up and practicing a little every day. What project are you proud of lately?",created_at:new Date(Date.now()-1000*60*60*4).toISOString(),profiles:{id:"sample-1",full_name:"Mika Reyes",headline:"Graphic Designer | Visual Storytelling",location:"Manila, Philippines"}}
  ];

  function toast(message, isError=false) {
    const el=$("toast"); el.textContent=message; el.classList.toggle("error",isError); el.classList.add("show");
    clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),3400);
  }
  function escapeHtml(value="") {
    return String(value).replace(/[&<>"']/g, ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  }
  function initials(name="Nexa Member") { return name.trim().split(/\s+/).slice(0,2).map(s=>s[0]||"").join("").toUpperCase() || "N"; }
  function timeAgo(date) {
    const mins=Math.max(0,Math.floor((Date.now()-new Date(date).getTime())/60000));
    if(mins<1)return "Just now"; if(mins<60)return `${mins}m ago`;
    const hrs=Math.floor(mins/60); if(hrs<24)return `${hrs}h ago`;
    const days=Math.floor(hrs/24); return days<7?`${days}d ago`:new Date(date).toLocaleDateString();
  }
  function setView(view) {
    $("landing-view").classList.toggle("hidden",view!=="landing");
    $("auth-view").classList.toggle("hidden",view!=="auth");
    $("app-view").classList.toggle("hidden",view!=="app");
    $("top-actions").classList.toggle("hidden",view==="app");
    $("member-actions").classList.toggle("hidden",view!=="app");
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function showAuth(mode) {
    authMode=mode; const signup=mode==="signup";
    $("auth-heading").textContent=signup?"Create your Nexa account":"Welcome back";
    $("auth-description").textContent=signup?"Start building your professional network.":"Sign in to continue to your network.";
    $("signin-tab").classList.toggle("active",!signup); $("signup-tab").classList.toggle("active",signup);
    $("name-label").classList.toggle("hidden",!signup); $("auth-name").required=signup;
    $("terms-label").classList.toggle("hidden",!signup); $("auth-terms").required=signup;
    $("auth-password").autocomplete=signup?"new-password":"current-password";
    $("auth-submit").textContent=signup?"Create account":"Sign in";
    $("forgot-password").classList.toggle("hidden",signup);
    $("auth-form").reset(); setView("auth");
  }
  function openPage(page) {
    if(!currentUser){showAuth("signin");return;}
    document.querySelectorAll(".page-panel").forEach(el=>el.classList.add("hidden"));
    const target=$(page+"-page"); if(target)target.classList.remove("hidden");
    document.querySelectorAll(".nav-button[data-page]").forEach(el=>el.classList.toggle("active",el.dataset.page===page));
    if(page==="feed")loadFeed(); if(page==="network")loadNetwork(); if(page==="jobs")renderJobs(); if(page==="profile")fillProfileForm();
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function showModal(title, html) {
    $("modal-title").textContent=title; $("modal-content").innerHTML=html; $("modal-backdrop").classList.remove("hidden");
  }
  function closeModal(){$("modal-backdrop").classList.add("hidden");}
  function profileOf(post) { return post.profiles || currentProfile || {full_name:"Nexa Member",headline:"Professional community member"}; }
  function renderPost(post) {
    const profile=profileOf(post), own=currentUser&&post.user_id===currentUser.id;
    return `<article class="post-card card" data-post-id="${escapeHtml(post.id)}">
      <div class="post-author"><div class="avatar">${escapeHtml(initials(profile.full_name))}</div><div class="author-details"><strong>${escapeHtml(profile.full_name||"Nexa Member")}</strong><small>${escapeHtml(profile.headline||"Nexa community member")} · ${escapeHtml(timeAgo(post.created_at))}</small></div>${own?`<button class="post-menu delete-post" data-id="${escapeHtml(post.id)}" aria-label="Delete your post" title="Delete post">···</button>`:""}</div>
      <p class="post-body">${escapeHtml(post.content||"")}</p>
      <div class="post-metrics"><span>♡ Community conversation</span><span>Share an encouraging comment</span></div>
      <div class="post-actions"><button class="post-like" data-id="${escapeHtml(post.id)}">♡ Like</button><button class="post-comment" data-id="${escapeHtml(post.id)}">▢ Comment</button><button class="post-share" data-id="${escapeHtml(post.id)}">↗ Share</button></div>
    </article>`;
  }
  async function loadFeed() {
    const list=$("feed-list"); list.innerHTML='<div class="loading-card card">Loading your community…</div>';
    if(db&&currentUser) {
      const {data,error}=await db.from("posts").select("id,user_id,content,created_at,profiles(id,full_name,headline,location)").order("created_at",{ascending:false}).limit(50);
      if(error){list.innerHTML='<div class="card empty-state"><strong>Could not load the feed.</strong>Please check your Supabase setup and database policies.</div>';return;}
      cachedPosts=data||[];
    } else cachedPosts=demoPosts;
    list.innerHTML=cachedPosts.length?cachedPosts.map(renderPost).join(""):'<div class="card empty-state"><strong>Your feed is ready for your first post.</strong>Share an idea, a milestone, or something you learned.</div>';
  }
  async function createPost(content) {
    if(!currentUser||!db){toast("Connect Supabase and sign in to publish posts.",true);return;}
    const {error}=await db.from("posts").insert({user_id:currentUser.id,content});
    if(error){toast(error.message,true);return;} $("post-content").value="";$("char-count").textContent="0 / 3000";$("post-form").classList.add("hidden");toast("Your post has been published.");loadFeed();
  }
  async function loadNetwork() {
    const list=$("network-list"); list.innerHTML='<div class="loading-card card">Finding people…</div>';
    if(db&&currentUser) {
      const {data,error}=await db.from("profiles").select("id,full_name,headline,location,skills").neq("id",currentUser.id).limit(60);
      if(error){list.innerHTML='<div class="card empty-state">Could not load profiles. Check your database setup.</div>';return;}
      cachedProfiles=data||[];
      const {data:conns}=await db.from("connections").select("addressee_id,requester_id,status").or(`requester_id.eq.${currentUser.id},addressee_id.eq.${currentUser.id}`);
      cachedConnections=conns||[];
    } else {cachedProfiles=demoPeople;cachedConnections=[];}
    renderNetwork();
  }
  function renderNetwork() {
    const q=($("global-search").value||"").toLowerCase();
    const people=cachedProfiles.filter(p=>p.id!==currentUser?.id&&[p.full_name,p.headline,p.location,(p.skills||[]).join(" ")].join(" ").toLowerCase().includes(q));
    $("network-list").innerHTML=people.length?people.map(p=>{
      const connection=cachedConnections.find(c=>(c.requester_id===currentUser?.id&&c.addressee_id===p.id)||(c.addressee_id===currentUser?.id&&c.requester_id===p.id));
      let label="＋ Connect", disabled="", cls="button button-outline";
      if(connection){label=connection.status==="accepted"?"✓ Connected":connection.requester_id===currentUser?.id?"Request sent":"Respond to request";disabled="";}
      if(p.id.startsWith("sample-")){label="Preview profile";cls="button button-outline";}
      return `<article class="person-card card"><div class="avatar">${escapeHtml(initials(p.full_name))}</div><h3>${escapeHtml(p.full_name)}</h3><p>${escapeHtml(p.headline||"Nexa member")}<br>${escapeHtml(p.location||"")}</p><button class="${cls} connect-button" data-id="${escapeHtml(p.id)}" ${disabled}>${label}</button></article>`;
    }).join(""):'<div class="card empty-state"><strong>No people found.</strong>Try another search.</div>';
  }
  async function connectTo(id) {
    if(!db||!currentUser){toast("Real connections require Supabase authentication.",true);return;}
    if(id===currentUser.id)return;
    const {error}=await db.from("connections").insert({requester_id:currentUser.id,addressee_id:id,status:"pending"});
    if(error){toast(error.code==="23505"?"A connection request already exists.":error.message,true);return;}
    toast("Connection request sent.");loadNetwork();
  }
  function renderJobs() {
    const q=($("job-search-input").value||"").toLowerCase();
    const jobs=demoJobs.filter(j=>[j.title,j.company,j.location,j.type,j.level,j.description].join(" ").toLowerCase().includes(q));
    $("jobs-list").innerHTML=jobs.length?jobs.map(j=>`<article class="job-card card"><div class="job-company"><div class="company-mark">${escapeHtml(initials(j.company).slice(0,1))}</div><div><h3>${escapeHtml(j.title)}</h3><span class="company-name">${escapeHtml(j.company)}</span></div></div><div class="job-meta"><span>⌖ ${escapeHtml(j.location)}</span><span>${escapeHtml(j.type)}</span><span>${escapeHtml(j.level)}</span></div><p>${escapeHtml(j.description)}</p><button class="button button-outline job-details" data-title="${escapeHtml(j.title)}" data-company="${escapeHtml(j.company)}">View details</button></article>`).join(""):'<div class="card empty-state"><strong>No matching sample jobs.</strong>Try a different keyword.</div>';
  }
  function fillProfileForm() {
    const p=currentProfile||{};
    $("profile-name").value=p.full_name||currentUser?.user_metadata?.full_name||"";
    $("profile-headline").value=p.headline||"";$("profile-location").value=p.location||"";
    $("profile-about").value=p.about||"";$("profile-skills").value=Array.isArray(p.skills)?p.skills.join(", "):(p.skills||"");
  }
  async function loadProfile() {
    if(!currentUser)return;
    if(db) {
      const {data,error}=await db.from("profiles").select("*").eq("id",currentUser.id).maybeSingle();
      if(error){console.error(error);toast("Unable to load profile details.",true);}
      currentProfile=data;
      if(!data) {
        const name=currentUser.user_metadata?.full_name||currentUser.email?.split("@")[0]||"Nexa Member";
        const {data:created}=await db.from("profiles").upsert({id:currentUser.id,full_name:name},{onConflict:"id"}).select().maybeSingle();
        currentProfile=created||{id:currentUser.id,full_name:name};
      }
    } else currentProfile={id:currentUser.id,full_name:currentUser.user_metadata?.full_name||"Demo Member",headline:"Growing my professional network",location:"Philippines",about:"",skills:[]};
    const p=currentProfile||{};
    $("mini-name").textContent=p.full_name||"Nexa Member";$("mini-headline").textContent=p.headline||"Add a professional headline";
    $("mini-avatar").textContent=initials(p.full_name);$("composer-avatar").textContent=initials(p.full_name);$("profile-editor-avatar").textContent=initials(p.full_name);
    fillProfileForm();
    if(db){const {count}=await db.from("connections").select("*",{count:"exact",head:true}).eq("status","accepted").or(`requester_id.eq.${currentUser.id},addressee_id.eq.${currentUser.id}`);$("connection-count").textContent=count??0;}
  }
  async function saveProfile(e) {
    e.preventDefault();if(!currentUser||!db){toast("Connect Supabase and sign in to save a real profile.",true);return;}
    const updates={id:currentUser.id,full_name:$("profile-name").value.trim(),headline:$("profile-headline").value.trim(),location:$("profile-location").value.trim(),about:$("profile-about").value.trim(),skills:$("profile-skills").value.split(",").map(s=>s.trim()).filter(Boolean).slice(0,30),updated_at:new Date().toISOString()};
    const {data,error}=await db.from("profiles").upsert(updates,{onConflict:"id"}).select().single();
    if(error){toast(error.message,true);return;}currentProfile=data;await loadProfile();$("profile-status").textContent="Saved successfully";toast("Your profile has been updated.");
  }
  async function authSubmit(e) {
    e.preventDefault();
    if(!db){toast("Setup required: add your Supabase project URL and anon key in app.js.",true);return;}
    const email=$("auth-email").value.trim(),password=$("auth-password").value;
    const submit=$("auth-submit");submit.disabled=true;submit.textContent="Please wait…";
    try {
      if(authMode==="signup") {
        if(!$("auth-terms").checked){toast("Please accept the community guidelines.",true);return;}
        const full_name=$("auth-name").value.trim();if(full_name.length<2){toast("Please enter your full name.",true);return;}
        const {data,error}=await db.auth.signUp({email,password,options:{data:{full_name},emailRedirectTo:window.location.origin+window.location.pathname}});
        if(error)throw error;
        if(data.session){toast("Account created! Welcome to Nexa.");}
        else {toast("Check your email to confirm your account, then sign in.");setView("landing");return;}
      } else {
        const {error}=await db.auth.signInWithPassword({email,password});if(error)throw error;
        toast("Welcome back!");
      }
    } catch(err){toast(err.message||"Authentication failed.",true);}
    finally{submit.disabled=false;submit.textContent=authMode==="signup"?"Create account":"Sign in";}
  }
  async function logout() {if(db)await db.auth.signOut();currentUser=null;currentProfile=null;setView("landing");toast("You have signed out.");}
  async function resetPassword() {
    if(!db){toast("Configure Supabase first to enable password recovery.",true);return;}
    const email=$("auth-email").value.trim();if(!email){toast("Enter your email address first.",true);$("auth-email").focus();return;}
    const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+window.location.pathname});
    if(error)toast(error.message,true);else toast("If the account exists, a password reset email has been sent.");
  }
  async function onSession(session) {
    currentUser=session?.user||null;
    if(currentUser){setView("app");await loadProfile();openPage("feed");}
    else setView("landing");
  }
  function wireEvents() {
    document.querySelectorAll("[data-auth-view]").forEach(b=>b.addEventListener("click",()=>showAuth(b.dataset.authView)));
    $("signin-tab").onclick=()=>showAuth("signin");$("signup-tab").onclick=()=>showAuth("signup");$("back-to-home").onclick=()=>setView("landing");
    $("auth-form").addEventListener("submit",authSubmit);$("forgot-password").onclick=resetPassword;
    $("logout-button").onclick=logout;
    document.querySelectorAll("[data-page]").forEach(b=>b.addEventListener("click",()=>openPage(b.dataset.page)));
    $("composer-open").onclick=$("write-post-button").onclick=()=>{if(!currentUser){showAuth("signin");return;}$("post-form").classList.remove("hidden");$("post-content").focus();};
    $("post-content").addEventListener("input",()=>$("char-count").textContent=`${$("post-content").value.length} / 3000`);
    $("post-form").addEventListener("submit",e=>{e.preventDefault();const content=$("post-content").value.trim();if(!content)return toast("Write something before publishing.",true);createPost(content);});
    $("profile-form").addEventListener("submit",saveProfile);
    $("job-search-button").onclick=renderJobs;$("job-search-input").addEventListener("keydown",e=>{if(e.key==="Enter")renderJobs();});
    $("global-search").addEventListener("input",()=>{if(!$("network-page").classList.contains("hidden"))renderNetwork();else if(currentUser){openPage("network");renderNetwork();}});
    $("feed-list").addEventListener("click",async e=>{
      const del=e.target.closest(".delete-post");if(del){showModal("Delete this post?",'<p>This action cannot be undone.</p><button id="confirm-delete" class="button button-primary full-width">Delete post</button>');$("confirm-delete").onclick=async()=>{const {error}=await db.from("posts").delete().eq("id",del.dataset.id).eq("user_id",currentUser.id);closeModal();if(error)toast(error.message,true);else{toast("Post deleted.");loadFeed();}};return;}
      const like=e.target.closest(".post-like");if(like){toast("Likes are ready to add with a likes table in a future version.");return;}
      const comment=e.target.closest(".post-comment");if(comment){showModal("Join the conversation",'<p>Comments are not enabled in this starter build. You can extend the schema with a comments table and row-level security policies.</p>');return;}
      const share=e.target.closest(".post-share");if(share){try{await navigator.clipboard.writeText(window.location.href+"#post-"+share.dataset.id);toast("Link copied.");}catch{toast("Copy the page URL to share this post.");}}
    });
    $("network-list").addEventListener("click",e=>{const b=e.target.closest(".connect-button");if(!b)return;if(b.dataset.id.startsWith("sample-")){showModal("Community member",'<p>This is sample profile content. Configure Supabase and invite members to see real profiles and send connection requests.</p>');return;}connectTo(b.dataset.id);});
    $("jobs-list").addEventListener("click",e=>{const b=e.target.closest(".job-details");if(!b)return;showModal(b.dataset.title,`<p><strong>${escapeHtml(b.dataset.company)}</strong></p><p>This is a sample job listing for the Nexa prototype. Connect a verified job source before using these listings for real applications.</p><button id="job-modal-close" class="button button-primary full-width">Got it</button>`);$("job-modal-close").onclick=closeModal;});
    $("modal-close").onclick=closeModal;$("modal-backdrop").addEventListener("click",e=>{if(e.target===$("modal-backdrop"))closeModal();});
  }
  async function init() {
    wireEvents();
    if(!db){setView("landing");return;}
    const {data:{session}}=await db.auth.getSession();await onSession(session);
    db.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>onSession(session),0);});
  }
  init();
})();
