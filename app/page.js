"use client"
import { useState } from "react";
import { signInAnonymously } from "firebase/auth";
import { auth, db } from "@/firebase/firebaseConfig";
import { setDoc, doc, collection, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function Home() {
    const [username, setUsername] = useState("")
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter()

    const handleSubmit = async (e)=>{
        e.preventDefault()
        setError("");

        const trimmedUsername = username.trim();
        if (!trimmedUsername) {
            setError("Username cannot be empty");
            return;
        }

        setLoading(true);

        try{

            const lowercaseUsername = trimmedUsername.toLowerCase();

            const usersRef = collection(db, "users");
            const q = query(usersRef, where("username_lower", "==", lowercaseUsername));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                //checking if same user is trying to log in again
                const existingUserDoc = querySnapshot.docs[0];
                const existingUser = existingUserDoc.data();

                const storedUid = localStorage.getItem("uid");

                if (storedUid && storedUid === existingUser.uid) {
                    router.push("/chat");
                } else {
                    setError("Username already taken. Please choose another one.");
                }

                setLoading(false);
                return;
            }

            const result = await signInAnonymously(auth)
            const uid = result.user.uid

            await setDoc(doc(db, "users", uid), {
                uid: uid,
                username: trimmedUsername,
                username_lower: lowercaseUsername,
            })

            localStorage.setItem("uid", uid);
            router.push("/chat")
        } catch(error){
            console.error("Error signing in :", error)
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    }
    return (
        <>
            <div className="max-w-lg mx-auto h-screen">
                <div className="flex justify-center items-center h-full">
                    <div className="box flex justify-center items-center p-4 min-h-80 w-full mx-10 rounded-xl bg-gray-900">
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
                            <h2 className="text-center text-2xl font-semibold">Enter your username</h2>
                            <input className="border rounded-sm p-2" type="text" value={username} onChange={(e)=>setUsername(e.target.value)} placeholder="Enter username" />
                            {error && <p className="text-red-500 text-sm">{error}</p>}
                            <button className={`bg-purple-900 hover:bg-purple-950 p-2 rounded-sm font-semibold cursor-pointer ${loading ? "opacity-70 cursor-not-allowed" : ""}`} type="submit">{loading ? "Checking..." : "Join Chat"}</button>
                        </form>
                    </div>
                </div>
            </div>
        </>
    )
}