interface ButtonProps {
    className?: string;
    children: React.ReactNode;
    onClick?: () => void;
}

export default function Button({ className, children, onClick }: ButtonProps) {
    return (
        <button className={`px-2 py-1 bg-white hover:bg-gray-200 hover:scale-[103%] active:bg-gray-300 transition-all duration-100 text-black text-lg rounded-md border-2 border-solid border-black ${className}`} onClick={onClick}>
            {children}
        </button>
    );
}