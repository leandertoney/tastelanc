export default function ClaimSuccessPage() {
  return (
    <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">✓</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Event Published!</h1>
        <p className="text-gray-400 mb-8">
          Your event is now live on TasteLanc. Locals and tourists in Lancaster will be able to discover it.
        </p>
        <a
          href="https://tastelanc.com"
          className="inline-block bg-[#A41E22] hover:bg-[#C42428] text-white font-semibold py-3 px-8 rounded-xl transition-colors"
        >
          Visit TasteLanc
        </a>
      </div>
    </div>
  );
}
