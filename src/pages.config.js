import Graficos from './pages/Graficos';
import Dados from './pages/Dados';
import Upload from './pages/Upload';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Graficos": Graficos,
    "Dados": Dados,
    "Upload": Upload,
}

export const pagesConfig = {
    mainPage: "Graficos",
    Pages: PAGES,
    Layout: __Layout,
};