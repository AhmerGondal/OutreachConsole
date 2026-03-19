// --------------- Platform detection ---------------
function detectPlatform(email) {
    const sender = (email.from?.address || '').toLowerCase();
    const sub = email.subject.toLowerCase();
    if (sender.includes('linkedin.com') || sub.includes('linkedin'))
        return 'linkedin';
    if (sender.includes('wellfound.com') || sender.includes('angel.co') || sub.includes('wellfound'))
        return 'wellfound';
    return 'other';
}
// --------------- LinkedIn category detection ---------------
function detectLinkedInCategory(email) {
    const sub = email.subject;
    const body = email.text.slice(0, 800);
    const subLower = sub.toLowerCase();
    // --- CONNECTION / SOCIAL (must catch before recruiter_response) ---
    if (/accepted your (invitation|connection|request)/i.test(sub))
        return 'connection_acceptance';
    if (/explore their network/i.test(sub))
        return 'connection_acceptance';
    if (/wants to connect/i.test(sub))
        return 'connection_acceptance';
    if (/endorsed you/i.test(sub))
        return 'connection_acceptance';
    if (/congratulate/i.test(sub))
        return 'connection_acceptance';
    // --- APPLICATION CONFIRMATIONS (before recruiter patterns) ---
    if (/application was sent/i.test(sub))
        return 'application_confirmation';
    if (/you applied to/i.test(sub))
        return 'application_confirmation';
    if (/application submitted/i.test(sub))
        return 'application_confirmation';
    if (/applied for/i.test(sub))
        return 'application_confirmation';
    if (/thanks for applying/i.test(sub))
        return 'application_confirmation';
    // Be careful: "your application" in subject could be a response/rejection too
    // Only classify as confirmation if it doesn't match rejection keywords
    if (/your application/i.test(sub) && !/unfortunately|not moving|not proceeding|forward with other|filled/i.test(sub)) {
        // Check body for confirmation vs response signals
        if (/has been (sent|submitted|received)/i.test(`${sub}\n${body}`))
            return 'application_confirmation';
        // Don't auto-classify ambiguous "your application" — let it fall through to rejection/other checks
    }
    // --- REJECTION ---
    if (/we('ve| have) (decided to )?(move|go) forward with other/i.test(`${sub}\n${body}`))
        return 'rejection';
    if (/unfortunately.*application/i.test(`${sub}\n${body}`))
        return 'rejection';
    if (/not (moving|proceeding) forward/i.test(sub))
        return 'rejection';
    if (/update on your application/i.test(sub))
        return 'rejection';
    if (/position has been filled/i.test(sub))
        return 'rejection';
    if (/decided not to move forward/i.test(`${sub}\n${body}`))
        return 'rejection';
    if (/we will not be/i.test(sub))
        return 'rejection';
    if (/not a (good )?fit/i.test(sub))
        return 'rejection';
    // --- TRUE MESSAGE REPLIES (human signals) ---
    if (/messaged you/i.test(sub))
        return 'recruiter_response';
    if (/sent you a message/i.test(sub))
        return 'recruiter_response';
    if (/you have a new message/i.test(sub))
        return 'recruiter_response';
    if (/new message awaits/i.test(sub))
        return 'recruiter_response';
    if (/inmail from/i.test(sub))
        return 'recruiter_response';
    if (/would you be open/i.test(sub))
        return 'recruiter_response';
    if (/reach(ing)? out/i.test(sub))
        return 'recruiter_response';
    // Body fallback: LinkedIn message alert emails sometimes have generic subjects
    if (/sent you a message on linkedin/i.test(body))
        return 'recruiter_response';
    if (/new message awaits your response/i.test(body))
        return 'recruiter_response';
    if (/respond to .{1,40}linkedin message/i.test(body))
        return 'recruiter_response';
    // --- FOLLOW-UPS ---
    if (/replied to your/i.test(sub))
        return 'recruiter_follow_up';
    if (/following up/i.test(sub))
        return 'recruiter_follow_up';
    if (/are you (still )?interested/i.test(sub))
        return 'recruiter_follow_up';
    if (/checking in/i.test(sub))
        return 'recruiter_follow_up';
    // --- INTERVIEW (clear signals only) ---
    if (/invited? (you )?to interview/i.test(sub))
        return 'interview_invite';
    if (/interview scheduled/i.test(sub))
        return 'interview_invite';
    if (/schedule.{0,20}(call|interview|meeting)/i.test(sub))
        return 'interview_invite';
    if (/next steps.{0,15}interview/i.test(sub))
        return 'interview_invite';
    // --- LOW VALUE ---
    if (/jobs you might/i.test(subLower))
        return 'digest';
    if (/recommended for you/i.test(subLower))
        return 'digest';
    if (/your weekly/i.test(subLower))
        return 'digest';
    if (/people you may know/i.test(subLower))
        return 'digest';
    if (/who viewed your profile/i.test(subLower))
        return 'digest';
    if (/skills? quiz/i.test(subLower))
        return 'digest';
    if (/linkedin news/i.test(subLower))
        return 'marketing';
    if (/linkedin premium/i.test(subLower))
        return 'marketing';
    if (/try linkedin/i.test(subLower))
        return 'marketing';
    if (/is hiring/i.test(subLower))
        return 'reminder';
    if (/new job/i.test(subLower))
        return 'reminder';
    if (/apply now/i.test(subLower))
        return 'reminder';
    if (/opportunity.*at/i.test(subLower))
        return 'reminder';
    return 'unknown_relevant';
}
// --------------- Wellfound category detection ---------------
function detectWellfoundCategory(email) {
    const sub = email.subject;
    const body = email.text.slice(0, 800);
    // --- SUBJECT-ONLY: application confirmations (must win first) ---
    if (/application to .+ successfully submitted/i.test(sub))
        return 'application_confirmation';
    if (/application.*submitted/i.test(sub))
        return 'application_confirmation';
    if (/application.*received/i.test(sub))
        return 'application_confirmation';
    if (/you applied/i.test(sub))
        return 'application_confirmation';
    if (/thanks for (your )?appl/i.test(sub))
        return 'application_confirmation';
    if (/your application/i.test(sub) && !/unfortunately|not moving/i.test(sub))
        return 'application_confirmation';
    // --- SUBJECT-ONLY: rejection ---
    if (/not moving forward/i.test(sub))
        return 'rejection';
    if (/unfortunately/i.test(sub))
        return 'rejection';
    if (/decided not to/i.test(sub))
        return 'rejection';
    if (/position.*filled/i.test(sub))
        return 'rejection';
    // --- SUBJECT+BODY: real human/recruiter signals ---
    const combined = `${sub}\n${body}`;
    if (/sent you a message/i.test(combined))
        return 'recruiter_response';
    if (/interested in your profile/i.test(combined))
        return 'recruiter_response';
    if (/would like to talk/i.test(combined))
        return 'recruiter_response';
    if (/replied to/i.test(sub))
        return 'recruiter_follow_up';
    // --- SUBJECT-ONLY: real interview ---
    if (/invited? (you )?to interview/i.test(sub))
        return 'interview_invite';
    if (/interview scheduled/i.test(sub))
        return 'interview_invite';
    if (/schedule.{0,20}(call|interview)/i.test(sub))
        return 'interview_invite';
    // --- Low value ---
    if (/new jobs/i.test(sub))
        return 'digest';
    if (/weekly digest/i.test(sub))
        return 'digest';
    if (/trending/i.test(sub))
        return 'marketing';
    return 'unknown_relevant';
}
function detectCategory(email, platform) {
    if (platform === 'wellfound')
        return detectWellfoundCategory(email);
    if (platform === 'linkedin')
        return detectLinkedInCategory(email);
    return 'unknown_relevant';
}
// --------------- Priority / Action ---------------
const PRIORITY_MAP = {
    interview_invite: 'high',
    recruiter_response: 'high',
    recruiter_follow_up: 'high',
    rejection: 'medium',
    application_confirmation: 'low',
    connection_acceptance: 'low',
    reminder: 'low',
    unknown_relevant: 'low',
    digest: 'low',
    marketing: 'low',
};
const ACTION_CATEGORIES = new Set([
    'interview_invite',
    'recruiter_response',
    'recruiter_follow_up',
    'rejection',
]);
// --------------- Extraction ---------------
function extractWellfoundApplication(email) {
    const sub = email.subject;
    const body = email.text.slice(0, 2000);
    const subMatch = sub.match(/application to\s+(.+?)\s+at\s+(.+?)(?:\s+successfully|\s*$)/i);
    if (subMatch)
        return { role: subMatch[1].trim(), company: subMatch[2].trim() };
    const simpleMatch = sub.match(/application to\s+(.+?)(?:\s+submitted|\s+received|\s*$)/i);
    if (simpleMatch)
        return { role: null, company: simpleMatch[1].trim() };
    const bodyRole = body.match(/(?:role|position|job\s*title)[:\s]+([^\n]{2,60})/i);
    const bodyCompany = body.match(/(?:company|employer)[:\s]+([^\n]{2,40})/i);
    const bodyAt = body.match(/\bat\s+([A-Z][A-Za-z0-9\s&.'-]{1,40}?)(?:\s*[-–|,!.\n])/);
    return {
        role: bodyRole ? bodyRole[1].trim() : null,
        company: bodyCompany ? bodyCompany[1].trim() : bodyAt ? bodyAt[1].trim() : null,
    };
}
function extractCompany(email, platform) {
    if (platform === 'wellfound') {
        const wf = extractWellfoundApplication(email);
        if (wf.company)
            return wf.company;
    }
    const sub = email.subject;
    const body = email.text.slice(0, 1000);
    const atMatch = sub.match(/\bat\s+([A-Za-z][A-Za-z0-9\s&.'-]{1,40}?)(?:\s*[-–|,!]|\s*$)/i);
    if (atMatch)
        return atMatch[1].trim();
    const fromMatch = sub.match(/\bfrom\s+([A-Za-z][A-Za-z0-9\s&.'-]{1,40}?)(?:\s+sent|\s+is|\s*[-–|,]|\s*$)/i);
    if (fromMatch)
        return fromMatch[1].trim();
    const appliedAtMatch = sub.match(/applied to .+? at\s+([A-Za-z][A-Za-z0-9\s&.'-]{1,40}?)(?:\s*[-–|,.]|\s*$)/i);
    if (appliedAtMatch)
        return appliedAtMatch[1].trim();
    const bodyCompanyMatch = body.match(/company(?:\s*name)?[:\s]+([A-Za-z][A-Za-z0-9\s&.'-]{1,40})/i);
    if (bodyCompanyMatch)
        return bodyCompanyMatch[1].trim();
    const bodyAtMatch = body.match(/\bat\s+([A-Z][A-Za-z0-9\s&.'-]{1,40}?)(?:\s*[-–|,!.]|\s*\n)/);
    if (bodyAtMatch)
        return bodyAtMatch[1].trim();
    return null;
}
function extractRole(email, platform) {
    if (platform === 'wellfound') {
        const wf = extractWellfoundApplication(email);
        if (wf.role)
            return wf.role;
    }
    const sub = email.subject;
    const body = email.text.slice(0, 1000);
    const appliedMatch = sub.match(/applied (?:to|for)\s+(.+?)\s+at\s+/i);
    if (appliedMatch)
        return appliedMatch[1].trim();
    const submittedMatch = sub.match(/submitted[:\s]+(.+?)\s+at\s+/i);
    if (submittedMatch)
        return submittedMatch[1].trim();
    const bodyRoleMatch = body.match(/(?:role|position|job\s*title)[:\s]+([A-Za-z][^\n]{2,50})/i);
    if (bodyRoleMatch)
        return bodyRoleMatch[1].trim();
    const forMatch = sub.match(/application\s+for\s+(.+?)(?:\s+at\s+|\s*[-–|,.]|\s*$)/i);
    if (forMatch)
        return forMatch[1].trim();
    return null;
}
function extractContact(email) {
    const sentMatch = email.subject.match(/^(.+?)\s+sent you/i);
    if (sentMatch && sentMatch[1].length < 50)
        return sentMatch[1].trim();
    const fromMatch = email.subject.match(/^(.+?)\s+from\s+/i);
    if (fromMatch && fromMatch[1].length < 40)
        return fromMatch[1].trim();
    // Do NOT extract contact name from connection acceptance subjects
    // "Brian accepted your invitation" — Brian is not a lead contact
    const skipNames = new Set(['linkedin', 'wellfound', 'angellist', 'notifications', 'jobs', 'no-reply', 'noreply', 'team']);
    if (email.from?.name) {
        const normalized = email.from.name.toLowerCase().replace(/[^a-z]/g, '');
        if (!skipNames.has(normalized) && email.from.name.length < 50) {
            return email.from.name;
        }
    }
    return null;
}
function buildSnippet(email) {
    const text = email.text.replace(/\s+/g, ' ').trim();
    return text.slice(0, 200);
}
function buildFingerprint(email, platform, category) {
    if (email.messageId) {
        return `msgid::${email.messageId}`;
    }
    const dateKey = email.date
        ? email.date.toISOString().slice(0, 13)
        : 'nodate';
    const normalizedSubject = email.subject
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 80);
    return `${platform}::${category}::${normalizedSubject}::${dateKey}`;
}
// --------------- Main classifier ---------------
export function classifyEmail(email) {
    const platform = detectPlatform(email);
    const category = detectCategory(email, platform);
    const priority = PRIORITY_MAP[category];
    const actionRequired = ACTION_CATEGORIES.has(category);
    return {
        raw: email,
        platform,
        category,
        priority,
        actionRequired,
        companyName: extractCompany(email, platform),
        contactName: extractContact(email),
        roleTitle: extractRole(email, platform),
        snippet: buildSnippet(email),
        fingerprint: buildFingerprint(email, platform, category),
    };
}
export function buildApplicationKey(platform, companyName, roleTitle, fallbackSubject) {
    if (companyName) {
        const normCompany = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const normRole = roleTitle
            ? roleTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')
            : 'unknown';
        return `${platform}|${normCompany}|${normRole}`;
    }
    if (fallbackSubject) {
        const normSubject = fallbackSubject
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .slice(0, 60);
        return `${platform}|unmatched|${normSubject}`;
    }
    return null;
}
