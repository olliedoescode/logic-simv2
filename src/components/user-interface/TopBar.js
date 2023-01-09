const TopBar = ({ topBarValue, setTopBarValue, handleAddGate}) => {

    return (
        <>
            <form onSubmit={handleAddGate}>
                <input type='text'
                    value={topBarValue}
                    onChange={(e)=>setTopBarValue(e.target.value)} // changes top bar value to user input
                    placeholder='enter gate name here'
                ></input>
                <button type='submit'>group</button>
            </form>
        </>
    )

}

export default TopBar;