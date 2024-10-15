import { FuzzyProjectTarget } from '../../common/types'
import { generateProjectWithOllama } from '../../fuzzy_test/testOllama'

export class FuzzyProvider{
  public async makeProject(target: FuzzyProjectTarget){
    const {path, description} = target
    console.log(path)
    console.log(description)

    generateProjectWithOllama()
  }
}

