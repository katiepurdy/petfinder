(function () {
    const GOOGLE_PLACES_API_KEY = config.GOOGLE_PLACES_API_KEY;
    const PETFINDER_API_KEY = config.PETFINDER_API_KEY;
    const PROXY_URL = config.PROXY_URL;

    let bLazy = new Blazy({
        container: '.pet-result',
        offset: 5
    });

    let pets = {}; // Raw pet data
    let formattedPetData = {}; // Transformed raw pet data
    let petsToDisplay = []; // Filtered pet data based on current filter criteria
    let resultsCount = 0; // Updated as pets are added to petsToDisplay
    let numResultsAvailable = 0;
    let moreResultsAvailable = true;
    let loadingMore = false;

    let filterCriteria = {
        limit: 100,
        page: 1,
        status: 'adoptable',
        type: null,
        location: null,
        gender: null,
        coat: null,
        color: null
    }

    let getParams = () => {
        let params = {};
        // Add any filter criteria that's been set as a parameter
        for (key in filterCriteria) {
            if (filterCriteria[key] !== null) {
                params[key] = filterCriteria[key];
            }
        }
        return params;
    }

    let requestData = async (targetUrl, params) => {
        params = JSON.stringify(params);
        let fetchUrl = `${PROXY_URL}petfinder?reqUrl=${targetUrl}&params=${params}&clientId=${PETFINDER_API_KEY}`
        try {
            let response = await fetch(fetchUrl);
            let data = await response.json();
            return data;
        } catch (error) {
            displayErrorToUser();
        }
    }

    let requestDataWithoutParams = async (targetUrl) => {
        let fetchUrl = `${PROXY_URL}petfinder?reqUrl=${targetUrl}&clientId=${PETFINDER_API_KEY}`
        try {
            let response = await fetch(fetchUrl);
            let data = await response.json();
            return data;
        } catch (error) {
            displayErrorToUser();
        }
    }

    // TODO: Include distance in kilometers
    let displayResultsCount = (results) => {
        let resultsCountContainer = document.getElementById('results-count');
        let heading = document.createElement('h3');
        let countSpan = document.createElement('span');
        countSpan.textContent = resultsCount;
        heading.appendChild(countSpan);
        heading.textContent += ` ${resultsCount === 1 ? 'result' : 'results'} found near ${filterCriteria.location}`;
        // heading.textContent += ' results found (scroll for more)';
        resultsCountContainer.appendChild(heading);
    }

    let increasePageNumber = () => {
        filterCriteria.page += 1;
    }

    let appendPetResults = () => {
        let pageWrapper = document.getElementById('page-wrapper');
        let resultsContainer = document.getElementById('results');
        if (pageWrapper.contains(document.getElementById('load-more-container'))) {
            pageWrapper.removeChild(document.getElementById('load-more-container'));
        }
        let appendLoadMoreButton = () => {
            let loadMoreDiv = document.createElement('div');
            loadMoreDiv.classList.add('load-more');
            loadMoreDiv.id = 'load-more-container';
            let loadMoreButton = document.createElement('button');
            loadMoreButton.id = 'load-more-button';
            loadMoreButton.textContent = "Load more";
            loadMoreDiv.appendChild(loadMoreButton);
            pageWrapper.appendChild(loadMoreDiv);
            loadMoreButton.addEventListener('click', () => {
                loadingMore = true;
            });
            loadMoreButton.addEventListener('click', fetchPets);
        }
        petsToDisplay.forEach((pet) => {
            let petResult = document.createElement('div');
            petResult.classList.add('pet-result');
            let petImage = document.createElement('img');
            petImage.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
            petImage.setAttribute('data-src', pet.image);
            petImage.alt = `A picture of ${pet.name}`;
            petImage.classList.add('b-lazy');
            petResult.appendChild(petImage);
            let imageCaption = document.createElement('div');
            imageCaption.classList.add('image-caption');
            petResult.appendChild(imageCaption);
            let petDetails = document.createElement('div');
            petDetails.classList.add('pet-details');
            let petName = document.createElement('p');
            petName.textContent = `Name: ${pet.name}`;
            petDetails.appendChild(petName);
            let petLocation = document.createElement('p');
            petLocation.textContent = `Location: ${pet.location}`;
            petDetails.appendChild(petLocation);
            if (pet.gender !== null) {
                let petGender = document.createElement('p');
                petGender.textContent = `Gender: ${pet.gender}`;
                petDetails.appendChild(petGender);
            }
            if (pet.coat !== null) {
                let petCoat = document.createElement('p');
                petCoat.textContent = `Coat: ${pet.coat}`;
                petDetails.appendChild(petCoat);
            }
            if (pet.color !== null) {
                let petColour = document.createElement('p');
                petColour.textContent = `Colour: ${pet.color}`;
                petDetails.appendChild(petColour);
            }
            imageCaption.appendChild(petDetails);
            // Wrap the pet result in a link to that pet's page on the Petfinder website
            if (pet.url !== null) {
                let link = document.createElement('a');
                link.href = pet.url;
                link.target = '_blank';
                link.appendChild(petResult);
                resultsContainer.appendChild(link);
            } else {
                resultsContainer.appendChild(petResult);
            }
            // Let the lazy loading library know that there's a new image
            bLazy.revalidate();
        });
        if (moreResultsAvailable) {
            appendLoadMoreButton();
        }
    }

    let updatePetResults = () => {
        let resultsContainer = document.getElementById('results');
        let resultsCountContainer = document.getElementById('results-count');
        resultsContainer.innerHTML = '';
        resultsCountContainer.innerHTML = '';
        displayResultsCount();
        appendPetResults();
    }

    let displayErrorToUser = () => {
        let resultsContainer = document.getElementById('results');
        resultsContainer.innerHTML = '<h3 class="error">Something went wrong.</h3>';
    }

    let displayLoadingAnimation = () => {
        let fullScreenWrapper = document.createElement('div');
        fullScreenWrapper.classList.add('full-screen');
        fullScreenWrapper.id = 'js-full-screen-wrapper';
        let spinner = document.createElement('div');
        spinner.classList.add('loader');
        fullScreenWrapper.appendChild(spinner);
        document.body.appendChild(fullScreenWrapper);
    }

    let removeLoadingAnimation = () => {
        let fullScreenWrapper = document.getElementById('js-full-screen-wrapper');
        document.body.removeChild(fullScreenWrapper);
    }

    let formatPetData = () => {
        formattedPetData = pets.map((pet) => {
            let formattedPet = {
                name: pet.name,
                type: pet.species,
                status: pet.status,
                location: pet.contact.address.city,
                image: null,
                gender: pet.gender,
                coat: pet.coat,
                color: pet.colors.primary,
                url: pet.url
            }
            if (pet.photos[0] && pet.photos[0].hasOwnProperty(['medium'])) {
                formattedPet.image = pet.photos[0]['medium'];
            }
            return formattedPet;
        });
    }

    let filterPetData = () => {
        petsToDisplay = formattedPetData.filter((pet) => pet.image !== null);
    }

    let fetchPets = async () => {
        let targetUrl = `https://api.petfinder.com/v2/animals`;
        let params = getParams();
        displayLoadingAnimation();
        pets = await requestData(targetUrl, params);
        numResultsAvailable = pets.pagination.total_count;
        pets = pets.animals;
        formatPetData();
        filterPetData();
        moreResultsAvailable = (numResultsAvailable - filterCriteria.limit) > 0;
        if (loadingMore) {
            resultsCount += petsToDisplay.length;
            increasePageNumber();
        } else {
            resultsCount = petsToDisplay.length;
        }
        updatePetResults();
        removeLoadingAnimation();
    }

    let handleSelectBoxChange = (event) => {
        if (event.target.id === 'city-select') {
            filterCriteria.location = event.target.value;
        } else if (event.target.id === 'gender-select') {
            filterCriteria.gender = event.target.value;
        } else if (event.target.id === 'coat-select') {
            filterCriteria.coat = event.target.value;
        } else if (event.target.id === 'colour-select') {
            filterCriteria.color = event.target.value;
        }
        if (filterCriteria.location !== null && filterCriteria.type !== null) {
            enableAllSelectBoxes();
            fetchPets();
        }
    }

    let getSelectOptions = async () => {
        let targetUrl = `https://api.petfinder.com/v2/types/${filterCriteria.type}`;
        let data = await requestDataWithoutParams(targetUrl);
        return data;
    }

    let displaySelectBoxOptions = async () => {
        let selectBoxOptions = await getSelectOptions();
        selectBoxOptions = selectBoxOptions.type;
        populateSelectBoxOptions(selectBoxOptions);
    }

    let setSpecies = async () => {
        let speciesRadioButtons = document.getElementsByName('species');
        let resultsContainer = document.getElementById('results');
        // The radio buttons weren't being read as checked without setTimeout for some reason
        setTimeout(async () => {
            displayLoadingAnimation();
            if (speciesRadioButtons[0].checked) {
                filterCriteria.type = 'Cat';
            } else if (speciesRadioButtons[1].checked) {
                filterCriteria.type = 'Dog';
            } else if (speciesRadioButtons[2].checked) {
                filterCriteria.type = 'Rabbit';
            }
            resultsContainer.innerHTML = '';
            loadingMore = false;
            numResultsAvailable = 0;
            resultsCount = 0;
            filterCriteria.page = 1;
            filterCriteria.coat = null;
            filterCriteria.color = null;
            displaySelectBoxOptions();
            removeLoadingAnimation();
            // Make an API request if the bare minimum info has been set
            if (filterCriteria.location && filterCriteria.type) {
                enableAllSelectBoxes();
                fetchPets();
            }
        }, 100);
    }

    let populateSelectBoxOptions = (selectOptions) => {
        let genders = selectOptions.genders;
        let coats = selectOptions.coats;
        let colours = selectOptions.colors;
        let genderSelect = document.getElementById('gender-select');
        let coatSelect = document.getElementById('coat-select');
        let colourSelect = document.getElementById('colour-select');
        let initialGenderOption = document.createElement('option');
        initialGenderOption.value = '';
        initialGenderOption.textContent = '--Select one--';
        let initialCoatOption = document.createElement('option');
        initialCoatOption.value = '';
        initialCoatOption.textContent = '--Select one--';
        let initialColourOption = document.createElement('option');
        initialColourOption.value = '';
        initialColourOption.textContent = '--Select one--';
        genderSelect.innerHTML = '';
        coatSelect.innerHTML = '';
        colourSelect.innerHTML = '';
        genderSelect.appendChild(initialGenderOption);
        coatSelect.appendChild(initialCoatOption);
        colourSelect.appendChild(initialColourOption);
        genders.forEach((gender) => {
            let genderOption = document.createElement('option');
            genderOption.value = gender;
            genderOption.textContent = gender;
            genderSelect.appendChild(genderOption);
        });
        coats.forEach((coat) => {
            let coatOption = document.createElement('option');
            coatOption.value = coat;
            coatOption.textContent = coat;
            coatSelect.appendChild(coatOption);
        });
        colours.forEach((colour) => {
            // The API doesn't want to accept requests containing parenthesis or ampersands, so let's remove the option to make a request with them
            // I don't think the proxy encodes them correctly
            if (colour.indexOf('(') === -1 && colour.indexOf('&') === -1) {
                let colourOption = document.createElement('option');
                colourOption.value = colour;
                colourOption.textContent = colour;
                colourSelect.appendChild(colourOption);
            }
        });
    }

    let autoPopulateCitySelectBox = (location) => {
        // Get the list of cities in the dropdown to compare to the user's geolocation data
        let getCityOptions = () => {
            let optionsCollection = Array.from(citySelectBox.options);
            let options = [];
            optionsCollection.forEach((option) => {
                options.push(option.text);
            });
            return options;
        }
        let citySelectBox = document.getElementById('city-select');
        let cityOptions = getCityOptions();
        // If the city detected through geolocation is already available in the list of cities in the select box, display that as the selected option
        if (cityOptions.indexOf(location) !== -1) {
            citySelectBox.selectedIndex = cityOptions.indexOf(location);
        } else {
            // Create and select a new option to display the geolocation findings to the user
            let newOption = document.createElement('option');
            newOption.value = location;
            newOption.text = location;
            citySelectBox.appendChild(newOption);
            cityOptions = getCityOptions();
            citySelectBox.selectedIndex = cityOptions.indexOf(location);
        }
    }

    let getLocationName = async (latitude, longitude) => {
        try {
            const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_PLACES_API_KEY}`);
            const data = await response.json();
            return {
                city: data.results[6].address_components[0].long_name,
                province: data.results[6].address_components[2].short_name
            };
        } catch (error) {
            console.log(error);
        };
    }

    let requestUserLocation = () => {
        let location = null;
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                location = await getLocationName(position.coords.latitude, position.coords.longitude);
                filterCriteria.location = `${location.city}, ${location.province}`;
                localStorage.setItem('petfinder_location', JSON.stringify(location));
                autoPopulateCitySelectBox(`${location.city}, ${location.province}`);
            });
        }
    }

    let displayUserLocationIfAvailable = () => {
        if (JSON.parse(localStorage.getItem('petfinder_location'))) {
            let location = JSON.parse(localStorage.getItem('petfinder_location'));
            filterCriteria.location = `${location.city}, ${location.province}`;
            autoPopulateCitySelectBox(`${location.city}, ${location.province}`);
        } else {
            requestUserLocation();
        }
    }

    let disableSelectBoxes = () => {
        let genderSelect = document.getElementById('gender-select');
        let coatSelect = document.getElementById('coat-select');
        let colourSelect = document.getElementById('colour-select');
        genderSelect.disabled = true;
        coatSelect.disabled = true;
        colourSelect.disabled = true;
    }

    let enableAllSelectBoxes = () => {
        let citySelect = document.getElementById('city-select');
        let genderSelect = document.getElementById('gender-select');
        let coatSelect = document.getElementById('coat-select');
        let colourSelect = document.getElementById('colour-select')
        citySelect.disabled = false;
        genderSelect.disabled = false;
        coatSelect.disabled = false;
        colourSelect.disabled = false;
    }

    let checkForSpeciesAndCitySelection = () => {
        if (filterCriteria.type && filterCriteria.location) {
            // Select boxes other than city aren't enabled until a species has been chosen because each species has different select options
            enableAllSelectBoxes();
            let criteriaDiv = document.getElementById('select-boxes-wrapper');
            criteriaDiv.removeEventListener('click', checkForSpeciesAndCitySelection);
        } else {
            alert('Please select a species and city first.');
        }
    }

    let attachEventListeners = () => {
        document.body.addEventListener('scroll', bLazy.revalidate());
        let speciesImages = Array.from(document.getElementsByClassName('species-image'));
        speciesImages.forEach((image) => {
            image.addEventListener('click', setSpecies);
        })
        let filterSelectBoxes = Array.from(document.getElementsByClassName('js-filter'));
        filterSelectBoxes.forEach((selectBox) => {
            selectBox.addEventListener('change', handleSelectBoxChange);
        });
    }

    let init = async () => {
        attachEventListeners();
        disableSelectBoxes();
        displayUserLocationIfAvailable();
    }

    init();

})();
