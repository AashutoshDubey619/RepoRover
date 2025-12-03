### Cors (Cross-Origin Resource Sharing): Security guard. Ye allow karega ki tumhara Frontend (React) tumhare Backend se baat kar sake.




# Agar interviewer puche: "Is code mein axios aur headers ka kya kaam hai?"
~ Tumhara Jawab:
"Sir, axios use karke hum GitHub ki REST API ko call karte hain. headers mein hum apna Authorization Token bhejte hain taaki GitHub humein rate-limit (block) na kare aur humein poora data access karne de."


## Recursion (Andar ke andar jaana) aur File Padhna.
Humara Logic:

GitHub se list mango.

Check karo: Ye File hai ya Folder?

📁 Agar Folder hai: Wapas step 1 pe jao (Usi folder ke andar ke liye).

📄 Agar File hai: Usko list mein add karo.

Interview Answer:

"Sir, file system ek 'Tree Structure' hota hai. Humein nahi pata ki depth kitni hogi. Isliye maine Recursion use kiya taaki main har folder ke andar ja sakun, chahe wo kitna bhi gehra ho."



# 👨‍🏫 Concept Class: Chunking & Embeddings (Interview Gold) 🥇
Code likhne se pehle, ye 2 concepts samajhna zaroori hai.

1. Chunking (Tukde karna) 🍕
Problem: Humare paas 19 files hain. Maan lo App.js mein 2000 lines hain. Agar hum poori file ek saath AI ko denge, toh 2 problems hongi:

Token Limit: AI bolega "Bhai itna sara text main nahi padh sakta."

Context Loss: AI beech ki important lines bhool jayega.

Solution: Hum code ko chote tukdon (Chunks) mein todenge.

Analogy: Jaise tum poora Pizza ek baar mein nahi kha sakte, slice-by-slice khate ho. Waise hi AI ko hum code Functions ya Paragraphs mein tod kar khilayenge.

2. Embeddings (Text to Numbers) 🔢
Computer/Database ko English/Code samajh nahi aata. Unhe sirf Numbers samajh aate hain.

Solution: Hum har Chunk ko Gemini ke paas bhejenge. Gemini us text ko padhega aur usse 768 Numbers ki list (Vector) mein convert karega.

Analogy:

"Login Code" -> [0.1, 0.5, 0.9...]

"Auth Code" -> [0.1, 0.6, 0.8...] (Dekho numbers paas hain)

"CSS Style" -> [0.9, 0.1, 0.0...] (Ye door hai)

Pinecone inhi numbers ko store karta hai taaki jab user puche "Login kaise hota hai?", toh wo paas wale numbers dhoond sake.


# 📦 Step 2: Libraries Install Karna
Humein 2 nayi cheezon ki zaroorat hai:

LangChain: Ye chunking (text split) karne mein expert hai. (Code ko todne ke liye).

Pinecone Client: Database se baat karne ke liye.



# "Humne vectorStore.js mein code ko 1000 characters ke Chunks (Tukdon) mein toda. Agar hum aisa nahi karte aur poori file ek saath Gemini ko bhej dete, toh kya problem aati?"
agar hum code ko tukdo me nhi todte aur pura ek sath 1000 characters bhj dete to bhot problems ho sakti hai jaise ki ... 1) Free tier khatam ho sakta hai ..due to more resource utilization 2) Ai ki memory jyada use hogi 3) Time jyada lagega main context dhundne me




# 👨‍🏫 Concept Class: app vs server (Interview Question)
Ye interview mein pucha ja sakta hai: "Express use karte waqt http module alag se kyu import kiya?"

Reason:

app (Express): Ye sirf ek "Manager" hai jo decide karta hai ki /api/chat pe kya hoga aur /api/ingest pe kya hoga. Isse network se matlab nahi hai.

server (HTTP): Ye "Building ka Main Gate" hai.

Socket.io: Ye Gate par khada rehta hai.

Jab tumne app.listen kiya, to Express ne chupke se ek Naya Gate bana liya jis par Socket.io khada hi nahi tha. Isliye logs nahi aa rahe the. Jab tumne server.listen kiya, to tumne usi Gate ko khola jaha Socket.io wait kar raha tha.


Jab interviewer puche: "Aise tools toh pehle se hain (like Cursor), tumne naya kya kiya?"

Tumhara Jawab:

*"Sir, I know tools like Cursor and Cody exist. My goal wasn't to compete with them directly, but to reverse-engineer their core architecture to deeply understand how RAG works at a system level.

While they are general-purpose editors, I focused on building a specialized 'On-Demand Code Auditor'. My tool solves the specific problem of quickly understanding a new open-source repo without cloning it locally. I engineered a lightweight, scalable solution using the MERN stack, Pinecone for vector search, and WebSockets for real-time feedback, creating a seamless 'plug-and-play' audit experience."*