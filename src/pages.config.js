import Dados from './pages/Dados';
import Graficos from './pages/Graficos';
import Upload from './pages/Upload';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dados": Dados,
    "Graficos": Graficos,
    "Upload": Upload,
}

export const pagesConfig = {
    mainPage: "Graficos",
    Pages: PAGES,
    Layout: __Layout,
};