/** Realistic Pakistani Roman Urdu + English developer/conversation corpus. */
import { describe, expect, it } from 'vitest'
import { romanUrduToScript, splitLatinRuns } from '../src/lib/speech'

const corpus = [
  "Aap API check kar ke mujhe update de dein.",
  "Please server restart kar dein, phir main test karta hoon.",
  "Actually mujhe ye issue samajh nahi aa raha.",
  "Laravel mein database connection ka masla aa raha hai.",
  "Is feature ki simple explanation chahiye.",
  "Agar deployment fail ho jaye to logs check karein.",
  "Backend se response nahi aa raha, frontend par error show ho raha hai.",
  "Maybe cache clear karne se issue solve ho jaye.",
  "Please GitHub par latest commit push kar dein.",
  "Meeting ke baad main aap ko complete update de dunga.",
  "Aaj API response slow hai, performance check karni hogi.",
  "Database migration run karne se pehle backup le lein.",
  "Actually ye problem production server par aa rahi hai.",
  "Please mujhe exact error message send kar dein.",
  "Is request ka response JSON format mein hona chahiye.",
  "Aap Laravel queue worker restart kar sakte hain?",
  "Redis cache expire hone ke baad data refresh hota hai.",
  "Frontend team ko API endpoint ki details share kar dein.",
  "Main ne code review kar liya hai, ab changes merge kar dein.",
  "Is branch par new changes available hain.",
  "Kal tak ye task complete ho jana chahiye.",
  "Aap pehle issue reproduce karein, phir fix apply karein.",
  "Please browser console aur network tab check karein.",
  "Server par PHP version update karna zaroori hai.",
  "Composer install ke baad application run karein.",
  "npm run build command successfully complete honi chahiye.",
  "React component mein state update nahi ho rahi.",
  "WordPress plugin activate karne ke baad error aa raha hai.",
  "Shopify webhook ka payload verify karna hoga.",
  "Stripe payment callback properly handle nahi ho raha.",
  "User login kar raha hai lekin dashboard open nahi hota.",
  "Authentication middleware request ko block kar raha hai.",
  "API token expire ho gaya hai, new token generate karein.",
  "Please database credentials verify kar lein.",
  "MySQL query mein index missing lag raha hai.",
  "MongoDB connection string environment variable mein set karein.",
  "Vercel deployment ke logs check karna.",
  "Local environment mein issue reproduce nahi ho raha.",
  "Production aur staging configuration compare karein.",
  "Is function ko reusable banana better hoga.",
  "Code mein duplicate logic remove kar dein.",
  "Please unnecessary changes commit na karein.",
  "Main ne pull request create kar di hai.",
  "Review comments resolve kar ke dobara push karein.",
  "Unit tests pass ho rahe hain lekin build fail hai.",
  "TypeScript error ka root cause identify karein.",
  "Is bug ka temporary workaround available hai.",
  "Permanent fix ke liye thori investigation chahiye.",
  "Please mujhe access permissions de dein.",
  "Repository private hai, invite accept karna hoga.",
  "Aap branch checkout kar ke latest changes pull karein.",
  "Git merge conflict resolve karna hai.",
  "CI pipeline mein test step fail ho raha hai.",
  "Docker container restart karne se service wapas aa gayi.",
  "Nginx configuration mein proxy timeout update karein.",
  "SSL certificate expire hone wala hai.",
  "API rate limit exceed ho gayi hai.",
  "Request validation properly implement karni hai.",
  "Response mein required fields missing hain.",
  "Please empty state aur loading state bhi handle karein.",
  "Mobile screen par layout properly responsive nahi hai.",
  "User experience improve karne ke liye spacing adjust karein.",
  "Button click karne par modal open hona chahiye.",
  "Form submit hone ke baad success message show karein.",
  "File upload ka progress indicator add kar dein.",
  "Image optimization se page speed better ho sakti hai.",
  "Accessibility ke liye proper labels add karein.",
  "Please is issue ko priority par fix karein.",
  "Abhi main available nahi hoon, thori der baad call karte hain.",
  "Actually ye approach mujhe better lag rahi hai.",
  "Good point, lekin is ke kuch edge cases bhi hain.",
  "Please ek simple example ke saath explain kar dein.",
  "Main ne already ye changes test kar liye hain.",
  "Maybe humein alternate solution try karna chahiye.",
  "Ye option available hai, aap use kar sakte hain.",
  "Sorry, mujhe previous message receive nahi hua.",
  "Please same issue dobara reproduce kar ke batayein.",
  "Everything looks fine, bas final review baqi hai.",
  "Aap mujhe exact requirements share kar dein.",
  "Is ka main purpose user experience improve karna hai.",
  "Ye kaam itna difficult nahi hai.",
  "Thora time lagega, lekin proper solution mil jayega.",
  "Main abhi check karta hoon aur update deta hoon.",
  "Please tension na lein, hum step by step solve kar lenge.",
  "Kal subah tak first version ready ho sakta hai.",
  "Aap free hon to short call kar lete hain.",
  "Is change ka impact existing users par nahi hona chahiye.",
  "Old data ko safely migrate karna zaroori hai.",
  "Backup ke baghair production database modify na karein.",
  "Please pehle staging environment par test karein.",
  "Ye change backward compatible rehna chahiye.",
  "Logs mein authentication failure ka reason mil jayega.",
  "User ko clear error message show karna chahiye.",
  "Network slow ho to retry mechanism use karein.",
  "Offline mode mein bhi basic features work karne chahiye.",
  "Audio playback start nahi ho rahi, voice settings check karein.",
  "Urdu voice ko sentence ke darmiyan unnecessary switch nahi karna chahiye.",
  "English technical terms ko correct pronunciation ke saath read karein.",
  "Roman Urdu ko natural Pakistani Urdu script mein convert karein.",
  "Please sentence ko robotic ya formal Urdu mein convert na karein.",
  "Is sentence mein Urdu grammar aur English vocabulary ka natural mix rakhein.",
  "Question mark par voice ka intonation natural hona chahiye.",
  "Long paragraph ko meaningful sentence chunks mein divide karein.",
  "Audio pause aur resume dono correctly work karne chahiye.",
  "Stop button press karne par current speech immediately stop honi chahiye."
]

describe('105-sentence Pakistani Roman Urdu mixed-language corpus', () => {
  it.each(corpus)('converts Urdu words without introducing Devanagari: %s', (sentence) => {
    const output = romanUrduToScript(sentence)
    expect(output).toMatch(/[\u0600-\u06FF]/)
    expect(output).not.toMatch(/[\u0900-\u097F]/)
  })

  it('preserves selected common English and technical words', () => {
    const output = romanUrduToScript('Aap please API check kar ke mujhe update de dein')
    for (const word of ['please', 'API', 'check', 'update']) expect(output).toContain(word)
    expect(output).toContain('آپ')
    expect(output).toContain('مجھے')
  })

  it('keeps adjacent English phrases together for speech', () => {
    const runs = splitLatinRuns('آپ API check کر کے server restart کر دیں')
    expect(runs.filter((run) => run.latin).map((run) => run.text)).toEqual(['API check', 'server restart'])
  })
})
