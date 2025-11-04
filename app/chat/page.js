"use client"
import { collection, getDocs, setDoc, getDoc, doc, addDoc, query, orderBy, onSnapshot } from "firebase/firestore"
import { auth, db } from "@/firebase/firebaseConfig"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"

const Chat = () => {
    const [rooms, setRooms] = useState([])
    const [activeRoom, setActiveRoom] = useState(null)
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState("")
    const [currentUser, setCurrentUser] = useState(null)
    const [sidebar, setSidebar] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

    const messageEndRef = useRef(null)

    const router = useRouter()

    useEffect(() => {
        if (messageEndRef.current) {
            messageEndRef.current.scrollIntoView({ behavior: "smooth" })
        }
    }, [messages])

    useEffect(() => {
        const fetchRooms = async () => {
            const querySnapshot = await getDocs(collection(db, "rooms"))
            const roomData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            setRooms(roomData)

            const savedRoom = localStorage.getItem("activeRoom");
            if (savedRoom) {
                const parsedRoom = JSON.parse(savedRoom);
                const foundRoom = roomData.find(r => r.id === parsedRoom.id);
                if (foundRoom) {
                    handleRoomSelect(foundRoom);
                }
            }
        }

        fetchRooms()

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            const storedUid = localStorage.getItem("uid");

            if (!user && !storedUid) {
                router.push("/");
                return;
            }

            if (!user && storedUid) {
                const userDoc = await getDoc(doc(db, "users", storedUid));
                if (userDoc.exists()) {
                    setCurrentUser({ uid: storedUid, ...userDoc.data() });
                }
                return;
            }

            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) setCurrentUser(userDoc.data());
        });

        return () => unsubscribe();
    }, [])

    const addRoom = async () => {
        const roomName = prompt("Enter Room Name")
        if (!roomName) return;

        const newRoomRef = doc(collection(db, "rooms"))
        await setDoc(newRoomRef, {
            name: roomName,
            createdAt: new Date(),
        })
        // Refreshing the room list
        setRooms((prev) => [...prev, { id: newRoomRef.id, name: roomName }])
    }

    const handleRoomSelect = async (room) => {
        setActiveRoom(room)
        localStorage.setItem("activeRoom", JSON.stringify(room));
        setTimeout(() => {
            setSidebar(false)
        }, 100);

        const messageRef = collection(db, "rooms", room.id, "messages")
        const q = query(messageRef, orderBy("createdAt", "asc"))

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            setMessages(msgs)
        })

    }

    const sendMessage = async () => {
        if (!newMessage.trim() || !activeRoom || !currentUser) return;

        await addDoc(collection(db, "rooms", activeRoom.id, "messages"), {
            text: newMessage,
            senderId: currentUser.uid,
            senderName: currentUser.username,
            createdAt: new Date(),
        });

        setNewMessage("");
    }

    const handleLogout = async () => {
        try {
            await signOut(auth)
            localStorage.removeItem("activeRoom");
            router.push("/")
        } catch (error) {
            console.error("Error logging out:", error)
        }
    }

    return (
        <>
            <nav className="fixed top-0 z-20 h-14 bg-slate-950 border-b border-gray-600 w-full">
                <ul className="flex justify-between items-center h-full mx-10">
                    <div className="flex items-center justify-center gap-4">
                        <span onClick={() => setSidebar(!sidebar)} className="sm:hidden cursor-pointer">
                            {sidebar ? (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="26" height="26" color="#ffffff" fill="none">
                                    <path d="M18 6L6 18M18 18L6 6" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="26" height="26" color="#ffffff" fill="none">
                                    <path d="M4 5H20M4 12H20M4 19H20" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                                </svg>
                            )}
                        </span>

                        <li className="font-bold text-xl">Chat App</li>
                    </div>

                    <div className="flex items-center gap-4">

                        {currentUser && (
                            <div className="flex items-center gap-2 bg-gray-800 px-3 py-1 rounded-lg shadow-md border border-gray-700">
                                <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-xs font-semibold uppercase">
                                    {currentUser.username[0]}
                                </div>

                                <span className="text-sm text-gray-200 font-medium">
                                    {currentUser.username}
                                </span>
                            </div>
                        )}

                        <li
                            onClick={() => handleLogout()}
                            className="bg-red-600 px-4 py-2 rounded-md cursor-pointer hover:bg-red-700 transition"
                        >
                            Log out
                        </li>
                    </div>
                </ul>
            </nav>

            <main>
                <section className="flex mt-14">
                    <div className={`left ${sidebar ? "block absolute left-0 z-10" : "hidden"} sm:block w-[300px] bg-slate-900 min-h-[calc(100vh-56px)] border-r border-gray-600 p-4 px-8`}>
                        <h2 className="text-lg text-center mb-2 font-semibold">Available Chat Rooms</h2>
                        <div className="flex flex-col items-center gap-2">
                            <input type="search" placeholder="search" className="border-2 border-slate-700 rounded-sm w-60 px-2 py-1" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                            <div className="flex flex-col gap-2 w-full">
                                {rooms.filter(room => room.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                    .map(room => (
                                        <h3
                                            key={room.id}
                                            onClick={() => handleRoomSelect(room)}
                                            className={`p-2 rounded-sm cursor-pointer transition-all duration-100 ease-out ${activeRoom?.name === room.name ? "bg-sky-500 hover:bg-sky-600" : "bg-gray-800 hover:bg-gray-700"}`}
                                        >
                                            {room.name}
                                        </h3>
                                    ))}
                                {rooms.filter(room => room.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && <p className="text-gray-400 text-center text-sm mt-2">No rooms found</p>}
                            </div>
                            <div onClick={addRoom} className="w-10 h-10 bg-sky-500 hover:bg-sky-600 cursor-pointer mt-2 rounded-full flex justify-center items-center">
                                <span className="text-3xl">+</span>
                            </div>
                        </div>
                    </div>

                    <div className="right relative flex-1 sm:ml-0 w-full bg-slate-900 min-h-[calc(100vh-56px)]">
                        {activeRoom ? (
                            <>
                                <div className="p-4 bg-gray-800">
                                    <h2 className="text-2xl font-semibold">{activeRoom.name}</h2>
                                </div>
                                {/* Message box */}
                                <div className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-56px-100px)] pb-10">
                                    {messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={`flex ${msg.senderId === currentUser?.uid ? "justify-end" : "justify-start"}`}
                                        >
                                            <div
                                                className={`relative max-w-[70%] px-3 py-2 rounded-lg text-white ${msg.senderId === currentUser?.uid ? "bg-blue-500 rounded-br-none" : "bg-gray-700 rounded-bl-none"}`}
                                            >
                                                {msg.senderId !== currentUser?.uid && (
                                                    <p className="text-sm text-gray-300 mb-1">{msg.senderName}</p>
                                                )}
                                                <span className="mr-12">
                                                    {msg.text}
                                                </span>
                                                <span className="text-[10px] text-gray-300 absolute bottom-1 right-2">
                                                    {msg.createdAt?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={messageEndRef}></div>
                                </div>
                                <div className="inputbox absolute bottom-4 w-full px-4">
                                    <div className="flex gap-4 max-w-3xl w-full mx-auto">
                                        <input className="bg-gray-800 p-2 rounded-sm w-full " type="text" placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} />
                                        <button onClick={() => sendMessage()} className="p-2 bg-blue-500 rounded-lg cursor-pointer hover:bg-blue-600  ">Send</button>
                                    </div>
                                </div>
                            </>

                        ) : (
                            <div className="flex justify-center items-center h-full text-gray-400 text-xl">Select a chat room to start chatting</div>
                        )
                        }
                    </div>
                </section>
            </main >
        </>
    )
}

export default Chat